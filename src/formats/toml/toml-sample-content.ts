export const getTomlSampleContent = (): string => `# Application configuration

title = "TOML Example"
enabled = true
max_connections = 42
ports = [8001, 8002, 8003]

[database]
server = "192.168.1.1"
connection_max = 5000
enabled = true

[owner]
name = "Tom Preston-Werner"
dob = 1979-05-27T07:32:00Z

[servers.alpha]
ip = "10.0.0.1"
role = "frontend"

[[products]]
name = "Hammer"
sku = 738594937

[[products]]
name = "Nail"
sku = 284758393
colors = { primary = "gray", secondary = "silver" }
`;
