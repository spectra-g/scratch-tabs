// Mock for remark-gfm to avoid ES module issues in Jest
module.exports = function remarkGfm() {
  return function transformer(tree) {
    return tree;
  };
};