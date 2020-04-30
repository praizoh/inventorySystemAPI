const mysql = require('mysql2/promise');
// Create Connection to the database
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'inventory_management_system',
    waitForConnections:true,
    queueLimit:0
});
// console.log(db)
if(db.state === 'disconnected'){
    console.log('Server Down')
}else{
    console.log('Connected with database') 
}
const connection = db;

module.exports = connection;
