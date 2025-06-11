function validateInput(req, res, next) {
  const { identifier, method } = req.body;
  if (!identifier || !method)
    return res
      .status(400)
      .json({ error: "Identifier and method are required" });
  if (!["email", "sms"].includes(method))
    return res.status(400).json({ error: "Method must be email or sms" });
  next();
}

export default validateInput;