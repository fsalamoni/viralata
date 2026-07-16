// Wrapper para resolver o problema de require sem extensão em .cjs
// O communityNotifications.js requer './communityNotificationsCore' sem extensão
// Node 20 (type: commonjs) só procura .js/.json/.node
module.exports = require('./communityNotificationsCore.cjs');
