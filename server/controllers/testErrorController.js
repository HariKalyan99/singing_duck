import captureDuck from "../main/captureDuck.js";
import buildServiceContext from "../helper/buildServiceContext.js";
import {
  triggerManualServiceError,
  triggerPromiseServiceError,
} from "../services/testService.js";

export async function testErrorController(req, res) {
  try {
    await triggerManualServiceError();
  } catch (err) {
    await captureDuck(err, {
      url: "/test-error",
      serviceContext: buildServiceContext(req, "triggerManualServiceError", true),
    });
  }

  res.status(200).json({ message: "Triggered manual error" });
}

export async function testPromiseErrorController(req, res) {
  await triggerPromiseServiceError().catch(async (err) => {
    await captureDuck(err, {
      url: "/promiseService",
      serviceContext: buildServiceContext(req, "triggerPromiseServiceError", true),
    });
  });

  res.status(200).json({ message: "Promise handled manually" });
}
