const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

exports.hashPassword = (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

exports.comparePassword = (password, hash) => {
  return bcrypt.compare(password, hash);
};
