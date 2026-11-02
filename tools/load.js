// Node에서 규칙을 불러오는 도우미
const path = require('path');
['balance.js', 'data.js', 'logic.js'].forEach(f => require(path.join(__dirname, '..', 'js', f)));
module.exports = globalThis.SH;
