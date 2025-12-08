exports.phcOnly = (req, res, next) => {
  if (req.user.role !== "phc") {
    return res.status(403).json({ error: "Access denied: PHC only" });
  }
  next();
};
