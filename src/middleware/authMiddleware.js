exports.phcOnly = (req, res, next) => {
  if (req.user.role !== "phc_admin") {
    return res.status(403).json({ error: "Access denied: PHC Admin only" });
  }
  next();
};
