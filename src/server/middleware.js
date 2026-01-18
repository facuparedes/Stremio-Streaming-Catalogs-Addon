export const validateToken = (ADMIN_TOKEN) => (req, res, next) => {
  if (!ADMIN_TOKEN) {
    return next();
  }

  const config = req.params.configuration;
  if (!config) {
    return res
      .status(401)
      .json({ error: "Unauthorized: No configuration provided" });
  }

  try {
    const decoded = Buffer.from(config, "base64").toString("ascii");
    const [token] = decoded.split(":");

    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
  } catch (e) {
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid configuration format" });
  }

  next();
};
