var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// paths.js
var require_paths = __commonJS({
  "paths.js"(exports2, module2) {
    var os = require("os");
    module2.exports = process.env["OS"] != "Windows_NT" ? {
      home: os.userInfo().homedir,
      sshAgent: "ssh-agent",
      sshAdd: "ssh-add"
    } : {
      home: os.homedir(),
      sshAgent: "c://progra~1//git//usr//bin//ssh-agent.exe",
      sshAdd: "c://progra~1//git//usr//bin//ssh-add.exe"
    };
  }
});

// cleanup.js
var { execSync } = require("child_process");
var { sshAgent } = require_paths();
try {
  console.log("Stopping SSH agent");
  execSync(sshAgent, ["-k"], { stdio: "inherit" });
} catch (error) {
  console.log(error.message);
  console.log("Error stopping the SSH agent, proceeding anyway");
}
