import { addSnapshot, containsDestructiveStatement, createSnapshotRecord } from "../engine/snapshots";
import { SqlSandboxSnapshot } from "../sqlSandboxTypes";

describe("SQL sandbox snapshots", () => {
  it("detects destructive SQL", () => {
    expect(containsDestructiveStatement("select * from users")).toBe(false);
    expect(containsDestructiveStatement("delete from users where id = 1")).toBe(true);
    expect(containsDestructiveStatement("DROP VIEW old_view")).toBe(true);
  });

  it("creates and prepends snapshot records", () => {
    const snapshot = createSnapshotRecord("select 1", "Before cleanup");
    const snapshots = addSnapshot([], snapshot);

    expect(snapshot.name).toBe("Before cleanup");
    expect(snapshots[0]).toBe(snapshot);
  });

  it("keeps the most recent 20 snapshots", () => {
    const snapshots = Array.from({ length: 25 }, (_, index) =>
      createSnapshotRecord(`select ${index}`, `Snapshot ${index}`),
    ).reduce((items, snapshot) => addSnapshot(items, snapshot), [] as SqlSandboxSnapshot[]);

    expect(snapshots).toHaveLength(20);
    expect(snapshots[0].name).toBe("Snapshot 24");
  });
});
