/* global */

import request from "request";

const url = "http://localhost:3333";

console.log("waiting for docker setup to be ready");

const waitfordocker = () => {
  request.
    get(url).
    on("response", () => {
      console.log("docker setup is ready");
    }).
    on("error", (err) => {
      console.log("docker setup is NOT ready yet:", err.code);
      setTimeout(waitfordocker, 1000);
    });
};

waitfordocker();
