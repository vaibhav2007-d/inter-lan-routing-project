
"use strict";

// INTER-LAN ROUTING PROJECT
// Cisco 1941 Router, two switches and four PCs
// Browser-based network simulation

const devices = {
  PC39: {
    ip: "192.168.1.2",
    mask: "255.255.255.0",
    gateway: "192.168.1.1",
    lan: 1,
    switchName: "Switch13"
  },
  PC40: {
    ip: "192.168.1.3",
    mask: "255.255.255.0",
    gateway: "192.168.1.1",
    lan: 1,
    switchName: "Switch13"
  },
  PC41: {
    ip: "192.168.2.2",
    mask: "255.255.255.0",
    gateway: "192.168.2.1",
    lan: 2,
    switchName: "Switch14"
  },
  PC42: {
    ip: "192.168.2.3",
    mask: "255.255.255.0",
    gateway: "192.168.2.1",
    lan: 2,
    switchName: "Switch14"
  }
};

const router = {
  name: "Router6",
  model: "Cisco 1941",
  interfaces: {
    "GigabitEthernet0/0": {
      ip: "192.168.1.1",
      mask: "255.255.255.0",
      enabled: true
    },
    "GigabitEthernet0/1": {
      ip: "192.168.2.1",
      mask: "255.255.255.0",
      enabled: true
    }
  }
};

const wait = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

function getElement(...ids) {
  for (const id of ids) {
    const element = document.getElementById(id);
    if (element) return element;
  }
  return null;
}

function writeOutput(message) {
  const output = getElement(
    "output", "terminal", "console", "pingOutput"
  );

  if (output) {
    output.textContent = message;
    output.scrollTop = output.scrollHeight;
  }

  console.log(message);
}

function getSelectedPC(ids, fallback) {
  const element = getElement(...ids);
  return element ? element.value : fallback;
}

function findPCByIP(ip) {
  return Object.keys(devices).find(
    name => devices[name].ip === ip
  );
}

function getNetwork(ip) {
  return ip.split(".").slice(0, 3).join(".") + ".0";
}

function isRouterReady(lan) {
  const port = lan === 1
    ? router.interfaces["GigabitEthernet0/0"]
    : router.interfaces["GigabitEthernet0/1"];

  return port.enabled;
}

function calculateRoute(source, destination) {
  const src = devices[source];
  const dest = devices[destination];

  if (!src || !dest) {
    return {
      success: false,
      message: "Invalid source or destination PC."
    };
  }

  const sameLAN = src.lan === dest.lan;

  if (!sameLAN &&
      (!isRouterReady(src.lan) ||
       !isRouterReady(dest.lan))) {
    return {
      success: false,
      message: "Router interface is down."
    };
  }

  const path = sameLAN
    ? [source, src.switchName, destination]
    : [
        source,
        src.switchName,
        router.name,
        dest.switchName,
        destination
      ];

  return {
    success: true,
    path,
    sameLAN,
    destinationIP: dest.ip
  };
}

function ping(source, destination) {
  const result = calculateRoute(source, destination);

  if (!result.success) {
    return "Ping failed: " + result.message;
  }

  const ip = result.destinationIP;

  const replies = Array.from(
    { length: 4 },
    () => `Reply from ${ip}: bytes=32 time<1ms TTL=127`
  );

  return [
    `${source}> ping ${ip}`,
    "",
    `Pinging ${ip} with 32 bytes of data:`,
    "",
    ...replies,
    "",
    `Ping statistics for ${ip}:`,
    "    Packets: Sent = 4, Received = 4,",
    "    Lost = 0 (0% loss)",
    "",
    "Packet Route:",
    result.path.join(" -> "),
    "",
    result.sameLAN
      ? "Communication within the same LAN."
      : "Inter-LAN routing through Router6.",
    "",
    "PING SUCCESSFUL"
  ].join("\n");
}

async function runPing() {
  const source = getSelectedPC(
    ["sourcePC", "source", "fromPC"],
    "PC39"
  );

  const destination = getSelectedPC(
    ["destinationPC", "destination", "toPC"],
    "PC41"
  );

  writeOutput(
    `Sending packets from ${source} to ${destination}...`
  );

  await wait(700);

  const result = ping(source, destination);
  writeOutput(result);

  const route = calculateRoute(source, destination);

  if (route.success) {
    animatePacket(route.path);
  }
}

function animatePacket(path) {
  const status = getElement(
    "packetStatus", "status", "routeStatus"
  );

  if (!status) return;

  let index = 0;

  status.textContent = "Packet started...";

  const interval = setInterval(() => {
    if (index >= path.length) {
      status.textContent = "Packet delivered successfully!";
      clearInterval(interval);
      return;
    }

    status.textContent = "Packet at: " + path[index];
    index++;
  }, 600);
}

function showRoutingTable() {
  const lines = [
    "Router6# show ip route",
    "",
    "Codes: C - connected, L - local",
    "",
    "Gateway of last resort is not set",
    "",
    "C 192.168.1.0/24 is directly connected,",
    "  GigabitEthernet0/0",
    "L 192.168.1.1/32 is directly connected,",
    "  GigabitEthernet0/0",
    "",
    "C 192.168.2.0/24 is directly connected,",
    "  GigabitEthernet0/1",
    "L 192.168.2.1/32 is directly connected,",
    "  GigabitEthernet0/1"
  ];

  writeOutput(lines.join("\n"));
}

function showInterfaces() {
  const lines = [
    "Router6# show ip interface brief",
    "",
    "Interface              IP-Address       Status",
    "GigabitEthernet0/0     192.168.1.1      " +
      (isRouterReady(1) ? "up" : "down"),
    "GigabitEthernet0/1     192.168.2.1      " +
      (isRouterReady(2) ? "up" : "down")
  ];

  writeOutput(lines.join("\n"));
}

function showConfiguration() {
  const lines = [
    "Router6# show running-config",
    "",
    "hostname Router6",
    "!",
    "interface GigabitEthernet0/0",
    " ip address 192.168.1.1 255.255.255.0",
    router.interfaces["GigabitEthernet0/0"].enabled
      ? " no shutdown"
      : " shutdown",
    "!",
    "interface GigabitEthernet0/1",
    " ip address 192.168.2.1 255.255.255.0",
    router.interfaces["GigabitEthernet0/1"].enabled
      ? " no shutdown"
      : " shutdown",
    "!",
    "end"
  ];

  writeOutput(lines.join("\n"));
}

function showIPTable() {
  const lines = [
    "DEVICE   IP ADDRESS      DEFAULT GATEWAY",
    "----------------------------------------"
  ];

  Object.entries(devices).forEach(([name, pc]) => {
    lines.push(
      `${name.padEnd(8)} ${pc.ip.padEnd(15)} ${pc.gateway}`
    );
  });

  writeOutput(lines.join("\n"));
}

function toggleRouterInterface(lan) {
  const name = lan === 1
    ? "GigabitEthernet0/0"
    : "GigabitEthernet0/1";

  const port = router.interfaces[name];

  port.enabled = !port.enabled;

  writeOutput(
    `${name} is now ${port.enabled ? "UP" : "DOWN"}`
  );
}

function resetNetwork() {
  Object.values(router.interfaces).forEach(port => {
    port.enabled = true;
  });

  writeOutput(
    "Network reset successfully.\n" +
    "All router interfaces are UP.\n" +
    "Ready for ping testing."
  );
}

function executeCommand(command) {
  const cmd = command.trim().toLowerCase();

  if (cmd === "show ip route") {
    showRoutingTable();
  } else if (cmd === "show ip interface brief") {
    showInterfaces();
  } else if (cmd === "show running-config") {
    showConfiguration();
  } else if (cmd.startsWith("ping ")) {
    const ip = cmd.substring(5).trim();
    const destination = findPCByIP(ip);

    if (!destination) {
      writeOutput("Destination host unreachable.");
      return;
    }

    const source = getSelectedPC(
      ["sourcePC", "source", "fromPC"],
      "PC39"
    );

    writeOutput(ping(source, destination));
  } else if (cmd === "help") {
    writeOutput([
      "Available commands:",
      "show ip route",
      "show ip interface brief",
      "show running-config",
      "ping 192.168.2.2",
      "help"
    ].join("\n"));
  } else {
    writeOutput(
      "Unknown command. Type help for available commands."
    );
  }
}

function runCommand() {
  const input = getElement(
    "commandInput", "cliInput", "command"
  );

  if (!input) return;

  executeCommand(input.value);
}

function setupProject() {
  const pingButton = getElement(
    "pingBtn", "runPingBtn"
  );

  const routeButton = getElement(
    "routeBtn", "routingBtn"
  );

  const commandButton = getElement(
    "commandBtn", "runCommandBtn"
  );

  if (pingButton) {
    pingButton.addEventListener("click", runPing);
  }

  if (routeButton) {
    routeButton.addEventListener(
      "click", showRoutingTable
    );
  }

  if (commandButton) {
    commandButton.addEventListener(
      "click", runCommand
    );
  }

  writeOutput(
    "INTER-LAN ROUTING SIMULATOR\n" +
    "Cisco 1941 Router - Router6\n" +
    "LAN 1: 192.168.1.0/24\n" +
    "LAN 2: 192.168.2.0/24\n\n" +
    "Network initialized successfully.\n" +
    "Select two PCs and run a ping test."
  );
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded", setupProject
  );
} else {
  setupProject();
}
