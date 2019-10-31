const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const mysql = require('mysql');
//require('./index')
const {secret}= require('./index');
console.log('secret is' + secret)


//db connection

//Create Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'inventory_management_system',
    //secret: 'yoursecret',
    multipleStatements: true

});





//Connect
db.connect((err) => {
    if(err){
        console.log('db connection failed \n Error:' +JSON.stringify(err));
    }
    console.log('MySql Connected...');
});
const mysqlConnection = db;


// To authenticate the user using jwt strategy
module.exports = (passport) => {
    let opts ={};
    opts.jwtFromRequest = ExtractJwt.fromAuthHeaderWithScheme('jwt');
    opts.secretOrKey = secret;
    passport.use(new JwtStrategy(opts, (jwt_payload, done)=> {
        mysqlConnection.query('SELECT * FROM user Where Staff_Id=?', [jwt_payload.data[0].Staff_Id], (err, user)=>{
            console.log(jwt_payload.data[0].Staff_Id);
            if (err) return done(err,false);
            if (user.length>0){
                roles=[]
                mysqlConnection.query('select r.role_name As Role from user u, role r, user_role s where u.username=? and r.role_id=s.role_id and s.staff_id=u.staff_id', [jwt_payload.data[0].Username], function(error,results,fields){
                    if (results.length>0){
                        Object.keys(results).forEach(function(key) {
                            var row = results[key];
                            console.log(row.Role)
                            roles.push(row.Role)
                        }); 
                    }
                })
                console.log(user);
                user[0].Roles=roles
                return done(null,user);
            }
            return done(null,false);
        });
    }));

}


