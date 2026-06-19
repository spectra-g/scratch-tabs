/**
 * Unit Tests for Docker Pipeline Operations
 *
 * Tests for docker.run-to-compose conversion.
 */

import { executeSingleOperation } from "../pipelineExecutor";
import "../operations/docker";

describe("Docker Pipeline Operations", () => {
    const execute = async (
        id: string,
        input: string,
        params: Record<string, unknown> = {},
    ): Promise<string> => {
        const result = await executeSingleOperation(id, input, params);
        if (!result.success) {
            throw new Error(result.error);
        }
        return result.output;
    };

    describe("docker.run-to-compose", () => {
        const run = (cmd: string) => execute("docker.run-to-compose", cmd);

        // ── Basic structure ──────────────────────────────────────────────────

        it("should produce a services key at the root", async () => {
            const result = await run("docker run nginx");
            expect(result).toMatch(/^services:/m);
        });

        it("should include the image name", async () => {
            const result = await run("docker run nginx:latest");
            expect(result).toContain("image: nginx:latest");
        });

        it("should derive service name from image when --name is absent", async () => {
            const result = await run("docker run nginx");
            expect(result).toContain("nginx:");
        });

        it("should use --name as the service name", async () => {
            const result = await run("docker run --name my-app nginx");
            expect(result).toContain("my-app:");
        });

        it("should handle 'docker container run' alias", async () => {
            const result = await run("docker container run nginx");
            expect(result).toContain("image: nginx");
        });

        it("should strip 'sudo' prefix", async () => {
            const result = await run("sudo docker run nginx");
            expect(result).toContain("image: nginx");
        });

        it("should throw when input does not start with docker run", async () => {
            await expect(run("kubectl run pod --image=nginx")).rejects.toThrow();
        });

        // ── Port mappings ────────────────────────────────────────────────────

        it("should map -p to ports", async () => {
            const result = await run("docker run -p 8080:80 nginx");
            expect(result).toContain("ports:");
            expect(result).toContain('"8080:80"');
        });

        it("should map --publish to ports", async () => {
            const result = await run("docker run --publish 443:443 nginx");
            expect(result).toContain('"443:443"');
        });

        it("should handle multiple port mappings", async () => {
            const result = await run("docker run -p 80:80 -p 443:443 nginx");
            expect(result).toContain('"80:80"');
            expect(result).toContain('"443:443"');
        });

        it("should handle --publish=host:container form", async () => {
            const result = await run("docker run --publish=9000:9000 sonarqube");
            expect(result).toContain('"9000:9000"');
        });

        // ── Volumes ──────────────────────────────────────────────────────────

        it("should map -v to volumes", async () => {
            const result = await run("docker run -v /host/data:/data nginx");
            expect(result).toContain("volumes:");
            expect(result).toContain("/host/data:/data");
        });

        it("should handle multiple volumes", async () => {
            const result = await run("docker run -v /a:/a -v /b:/b nginx");
            expect(result).toContain("/a:/a");
            expect(result).toContain("/b:/b");
        });

        it("should handle named volumes", async () => {
            const result = await run("docker run -v mydata:/var/lib/mysql mysql");
            expect(result).toContain("mydata:/var/lib/mysql");
        });

        // ── Environment variables ────────────────────────────────────────────

        it("should map -e to environment", async () => {
            const result = await run("docker run -e MY_VAR=hello nginx");
            expect(result).toContain("environment:");
            expect(result).toContain("MY_VAR=hello");
        });

        it("should handle multiple env vars", async () => {
            const result = await run("docker run -e A=1 -e B=2 nginx");
            expect(result).toContain("A=1");
            expect(result).toContain("B=2");
        });

        it("should handle --env-file", async () => {
            const result = await run("docker run --env-file .env nginx");
            expect(result).toContain("env_file:");
            expect(result).toContain(".env");
        });

        // ── Restart policy ───────────────────────────────────────────────────

        it("should map --restart to restart", async () => {
            const result = await run("docker run --restart always nginx");
            expect(result).toContain("restart: always");
        });

        it("should handle --restart=unless-stopped", async () => {
            const result = await run("docker run --restart=unless-stopped nginx");
            expect(result).toContain("restart: unless-stopped");
        });

        // ── User, workdir, hostname ──────────────────────────────────────────

        it("should map --user", async () => {
            const result = await run('docker run --user "1000:1000" nginx');
            expect(result).toContain("user:");
        });

        it("should map -u shorthand", async () => {
            const result = await run("docker run -u nobody nginx");
            expect(result).toContain("user:");
        });

        it("should map --workdir", async () => {
            const result = await run("docker run --workdir /app nginx");
            expect(result).toContain("working_dir: /app");
        });

        it("should map -w shorthand", async () => {
            const result = await run("docker run -w /workspace ubuntu");
            expect(result).toContain("working_dir: /workspace");
        });

        it("should map --hostname", async () => {
            const result = await run("docker run --hostname myhost nginx");
            expect(result).toContain("hostname: myhost");
        });

        // ── Entrypoint and command ────────────────────────────────────────────

        it("should map --entrypoint", async () => {
            const result = await run("docker run --entrypoint /bin/sh alpine");
            expect(result).toContain("entrypoint: /bin/sh");
        });

        it("should include trailing command args", async () => {
            const result = await run("docker run alpine echo hello");
            expect(result).toContain("command:");
            expect(result).toContain("echo");
        });

        it("should render multi-word command as list", async () => {
            const result = await run("docker run alpine echo hello world");
            expect(result).toMatch(/command:\s*\n\s+- echo/);
        });

        // ── Networks ─────────────────────────────────────────────────────────

        it("should map --network to networks", async () => {
            const result = await run("docker run --network my-network nginx");
            expect(result).toContain("networks:");
            expect(result).toContain("my-network");
        });

        // ── Labels ───────────────────────────────────────────────────────────

        it("should map --label", async () => {
            const result = await run("docker run --label app=web nginx");
            expect(result).toContain("labels:");
            expect(result).toContain("app=web");
        });

        it("should map -l shorthand for labels", async () => {
            const result = await run("docker run -l env=prod nginx");
            expect(result).toContain("labels:");
        });

        // ── Security & capabilities ──────────────────────────────────────────

        it("should map --privileged", async () => {
            const result = await run("docker run --privileged nginx");
            expect(result).toContain("privileged: true");
        });

        it("should map --read-only", async () => {
            const result = await run("docker run --read-only nginx");
            expect(result).toContain("read_only: true");
        });

        it("should map --cap-add", async () => {
            const result = await run("docker run --cap-add SYS_ADMIN nginx");
            expect(result).toContain("cap_add:");
            expect(result).toContain("SYS_ADMIN");
        });

        it("should map --cap-drop", async () => {
            const result = await run("docker run --cap-drop ALL nginx");
            expect(result).toContain("cap_drop:");
            expect(result).toContain("ALL");
        });

        // ── Resource limits ───────────────────────────────────────────────────

        it("should map --memory to deploy.resources.limits.memory", async () => {
            const result = await run("docker run --memory 512m nginx");
            expect(result).toContain("deploy:");
            expect(result).toContain("memory: 512m");
        });

        it("should map --cpus to deploy.resources.limits.cpus", async () => {
            const result = await run("docker run --cpus 1.5 nginx");
            expect(result).toContain("cpus: '1.5'");
        });

        it("should map -m shorthand for memory", async () => {
            const result = await run("docker run -m 256m nginx");
            expect(result).toContain("memory: 256m");
        });

        // ── Boolean flags (detach, interactive, tty, rm) ─────────────────────

        it("should silently ignore -d (detach)", async () => {
            const result = await run("docker run -d nginx");
            expect(result).not.toContain("detach");
            expect(result).toContain("image: nginx");
        });

        it("should silently ignore -it flags", async () => {
            const result = await run("docker run -it ubuntu bash");
            expect(result).not.toContain("tty");
            expect(result).not.toContain("interactive");
        });

        it("should silently ignore --rm", async () => {
            const result = await run("docker run --rm alpine echo hi");
            expect(result).not.toContain("rm");
            expect(result).toContain("image: alpine");
        });

        // ── Quoted values ─────────────────────────────────────────────────────

        it("should handle double-quoted values with spaces", async () => {
            const result = await run('docker run -e "MY_VAR=hello world" nginx');
            expect(result).toContain("MY_VAR=hello world");
        });

        it("should handle single-quoted values", async () => {
            const result = await run("docker run -e 'KEY=value' nginx");
            expect(result).toContain("KEY=value");
        });

        // ── Combined flags ────────────────────────────────────────────────────

        it("should handle combined -dit flag", async () => {
            const result = await run("docker run -dit ubuntu");
            expect(result).toContain("image: ubuntu");
        });

        // ── Complex real-world examples ───────────────────────────────────────

        it("should handle a full postgres command", async () => {
            const cmd =
                "docker run --name postgres-db -e POSTGRES_PASSWORD=secret " +
                "-e POSTGRES_DB=mydb -p 5432:5432 -v pgdata:/var/lib/postgresql/data " +
                "--restart unless-stopped postgres:15";
            const result = await run(cmd);
            expect(result).toContain("postgres-db:");
            expect(result).toContain("image: postgres:15");
            expect(result).toContain("POSTGRES_PASSWORD=secret");
            expect(result).toContain("POSTGRES_DB=mydb");
            expect(result).toContain('"5432:5432"');
            expect(result).toContain("pgdata:/var/lib/postgresql/data");
            expect(result).toContain("restart: unless-stopped");
        });

        it("should handle a full nginx command with workdir and user", async () => {
            const cmd =
                "docker run -d --name web -p 80:80 -v /srv/html:/usr/share/nginx/html:ro " +
                "--user 101:101 --workdir /usr/share/nginx/html nginx:alpine";
            const result = await run(cmd);
            expect(result).toContain("image: nginx:alpine");
            expect(result).toContain('"80:80"');
            expect(result).toContain("/srv/html:/usr/share/nginx/html:ro");
            expect(result).toContain("working_dir: /usr/share/nginx/html");
        });
    });
});
