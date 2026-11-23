import { handleApi } from "./api.js";

export function attachApi(middlewares) {
  middlewares.use(async (req, res, next) => {
    try {
      const handled = await handleApi(req, res);
      if (!handled) next();
    } catch (error) {
      res.statusCode = error.code === "HOLD" ? 409 : 400;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: error.message || "The laptop could not save that." }));
    }
  });
}
