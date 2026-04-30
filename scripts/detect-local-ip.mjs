import { networkInterfaces } from "node:os";

function detectLocalIp() {
  const all = Object.values(networkInterfaces())
    .flat()
    .filter(Boolean)
    .filter((entry) => entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address)
    .filter((address) => !address.startsWith("169.254."));

  const preferred = [
    all.find((address) => address.startsWith("192.168.137.")),
    all.find((address) => address.startsWith("172.20.10.")),
    all.find((address) => address.startsWith("192.168.")),
    all.find((address) => address.startsWith("10.")),
    all.find((address) => address.startsWith("172."))
  ].find(Boolean);

  return preferred || all[0] || "localhost";
}

process.stdout.write(detectLocalIp());
