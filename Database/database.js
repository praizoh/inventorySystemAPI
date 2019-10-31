const mysql = require('mysql2/promise');
//Create Connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'inventory_management_system',
    waitForConnections:true,
    conectionLimit:10,
    queueLimit:0
});

//Connect
db.connect((err) => {
    if(err){
        console.log('db connection failed \n Error:' +JSON.stringify(err));
    }
    console.log('MySql Connected...');
});
const mysqlConnection = db;

module.exports = mysqlConnection;
