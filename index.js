const express = require('express');
const mysql = require('mysql');
// const mysql2= require('mysql2/promise');
// const connection = mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
const app = express();
const bodyparser = require('body-parser');
const passport = require('passport')
const path = require('path')
const nodemailer = require("nodemailer");
app.use(bodyparser.json());
const cors = require('cors');
app.use(cors())
app.use(passport.initialize());
app.use(passport.session());
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
//Create Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'inventory_management_system',
    //secret: 'yoursecret',
    multipleStatements: true

});
const secret = "yoursecret";
module.exports= { secret };

//Connect
db.connect((err) => {
    if(err){
        console.log('db connection failed \n Error:' +JSON.stringify(err));
    }
    console.log('MySql Connected...');
});
const mysqlConnection = db;

//----------------------------------------------------REGISTER NEW USER---------------------------------------------//
app.post('/User', (req,res)=>{
    firstname= req.body.firstname;
    lastname= req.body.lastname;
    username= req.body.username;
    role = req.body.roles;
    email= req.body.email;
    phonenumber= req.body.phonenumber;
    
    if (firstname && lastname && username && email && phonenumber && role){
        //check if email already exits
        mysqlConnection.query('SELECT * from credential WHERE UserName=? or Email=?', [username,email], function(error,results,fields){
            if (results.length > 0){
                res.status(400)
                res.json({
                    success:false,
                    message:"User already exists"
                });
                //res.send("user already exists")
                res.end()
            }else
            {   
                const randomstring = Math.random().toString(36).slice(-8);
                password= randomstring;
                //console.log(password);
                bcrypt.genSalt(10, (err,salt)=> {
                    bcrypt.hash(password, salt, (err,hash) => {
                        if (err) throw err;
                        password=hash;
                       console.log("password hashed " + password)
                        mysqlConnection.query("insert into user (FirstName, LastName, UserName, Email, PhoneNumber) values ('"+firstname+"','"+lastname+"', '"+username+"', '"+email+"', '"+phonenumber+"')", (err, results)=>{
                           
                            if (!err){
                                res.status(201);
                                const lastId = results.insertId;
                                console.log(lastId + "1")

                                for (let j=0; j<role.length; j++){
                                    console.log("here")
                                    console.log(role[j])
                                    rolename=role[j]
                                    mysqlConnection.query('select role_id from role where role_name=?', [rolename], function(error,results,fields){
                                        if (results.length>0){
                                            console.log(results)
                                            roleId=results[0].role_id
                                            console.log('roleId is ' + roleId)
                                            console.log(lastId + "llop start")
                                            mysqlConnection.query("insert into user_role (Staff_Id, Role_Id) values ('"+lastId+"', '"+roleId+"')", (err)=>{
                                                console.log(lastId + j)
                                                if (!err){
                                                    console.log("role "+ role[j] + " inserted")
                                                }else{
                                                    console.log("role " + roleId + " not inserted")
                                                }
                                            })
                                        
                                            
                                        }else{
                                            console.log("roles not inserted")
                                        }
                                    }) 
                                } 
                                console.log("user roles added")
                            
                            }
                            else
                            console.log(err);
                        });
                        
                        
                        mysqlConnection.query("insert into credential (UserName, Password, Email) values ('"+username+"','"+password+"', '"+email+"')", (err)=>{
                        console.log("db pass" + password);
                            if (!err){

                                //--------------------------send email----------------------------------------------------------------
                                let transport = nodemailer.createTransport({
                                    host: 'smtp.mailtrap.io',
                                    port: 25,
                                    secure: false,
                                    
                                    auth: {
                                        // should be replaced with real sender's account
                                        user: '90d97788acb6ef',
                                        pass: 'e9fe5491a68bc7'
                                    }
                                });
                                let mailOptions = {
                                    // should be replaced with real  recipient's account
                                    from: 'noreplyKayar@gmail.com',
                                    to: 'oremei.akande@gmail.com',
                                    subject: 'Login Password',
                                    text: 'Your Passsword is ' + randomstring
                                };
                                transport.sendMail(mailOptions, (error, info) => {
                                    if (error) {
                                        return console.log(error);
                                    }
                                    console.log('Message %s sent: %s', info.messageId, info.response);
                                    res.json({
                                        sucess:true,
                                        message:"User password updated",
                                        data:randomstring
                                    })
                                    res.end()
                                });
                               




                                res.status(201)
                                res.send("user created")
                                console.log("user created")
                                res.end()

                            }
                            else
                                console.log(err);
                        });
                    })
                });
            }
        })

    } else{
        res.status(400);
        res.json({
            success:false,
            message:"Enter correct register details"
        })
    }
})


//---------------+----------------------------LOGIN-----------------------------------------------------------------------//
app.post('/login', (req,res)=>{                                     
  const username= req.body.username;
    const password = req.body.password;
    
    if(username && password){
        mysqlConnection.query('SELECT * from credential Where username=?', [username], function(error,results,fields){
            if (results.length >0){
                let db_password = mysqlConnection.query('SELECT Password from credential WHERE username=?', [username], function(error,results,row){
                    if (results.length > 0){
                        console.log(results[0].Password);
                        db_password=results[0].Password;
                        res.status(200)
                        comparepassword(password, db_password, (err, isMatch) =>{
                            if (err) throw err;
                            console.log(isMatch)
                            if (isMatch) {
                                // get data of the user
                                let roles = [];
                                let result= mysqlConnection.query('Select * from user Where Username=? and isActive=1', [username], function(error,results,fields){
                                    if (results.length > 0){
                                        // convert user to json
                                        const data = JSON.parse(JSON.stringify(results));
                                        let result = mysqlConnection.query('select r.role_name As Role from user u, role r, user_role s where u.username=? and r.role_id=s.role_id and s.staff_id=u.staff_id', [username], function(error,results,fields){
                                            if (results.length>0){
                                                Object.keys(results).forEach(function(key) {
                                                    var row = results[key];
                                                    console.log(row.Role)
                                                    roles.push(row.Role)
                                                  });
                                                  // add property roles to the user object
                                                  data[0].Roles=roles;
                                                  
                                                    //json token
                                                    const token = jwt.sign({
                                                        data
                                                    },
                                                    secret, {
                                                        expiresIn: 604800 //one week in miliseconds
                                                    }
                                                    );
                                                    return res.json({
                                                        success:true,
                                                        
                                                        token:"JWT " + token,
                                                        roleId:data[0].Roles,
                                                        Staff_Id:data[0].Staff_Id
                                                    });
                                            }else {
                                                res.status(401)
                                                return res.json({
                                                    success:false
                                                })
                                                res.end();
                                            }
                                        });
                                        
                                        
                                    }else{
                                        return res.json({
                                            success:false,
                                            message:"user not found or not active"
                                        })
                                    }
                                })
                           
                            }else{
                                return res.json({
                                    success: false,
                                    message: "Wrong Username or Password"
                                })
                            }
                        })
                        
                    }
                });
            }else{
                res.status(401)
                res.json({
                    success:false,
                    message:"Incorrect login details"
                })
                
            }
        })
    }else{
        res.status(401)
        res.json({
            success:false,
            message:"Enter the correct details"
        });
        
    }

    //bcrypt function
    function comparepassword(password, hash, callback){
        console.log('ordi pass ' + password)
        console.log('db pass ' + hash)
        bcrypt.compare(password, hash, (err, isMatch)=>{
            if (err) throw err
            callback(null, isMatch)
            
        })
    }
})


// bring in the passport authentication strategy
require('./passport')(passport);

//---------------------------------VIEW USER BY ID, VIEW USER PROFILE---------------------------------------------------

app.get('/Users/:id', passport.authenticate('jwt', {session:false}), (req,res)=>{
    console.log(req.user)
    id= req.params.id;
    mysqlConnection.query('Select * from user Where Staff_Id=?', [id], function(error,results,fields){
        if (results.length > 0){
            const data = JSON.parse(JSON.stringify(results));
            mysqlConnection.query('select r.role_name As Role from user u, role r, user_role s where u.Staff_Id=? and r.role_id=s.role_id and s.staff_id=u.staff_id', [id], function(error,results,fields){
                if (results.length>0){
                    Object.keys(results).forEach(function(key) {
                        var row = results[key];
                        console.log(row.Role)
                        roles.push(row.Role)
                    });
                      // add property roles to the user object
                    data[0].Roles=roles;
                    res.status(200);
                    return res.json({
                        success:true,
                        data   
                    });
                }else{
                    res.status(400);
                }
            });
            
            
        }else{
            res.status(400);
        }
    });


})

//the url below activates or deactivates a user
app.put('/status/Users/', passport.authenticate('jwt', {session:false}), (req,res)=>{
    isActive = req.body.isActive;
    id= req.body.staff_id
    console.log(isActive)
    console.log(id)
    if (id && isActive){
        mysqlConnection.query('Update user SET isActive=? where staff_id=?', [0, id], (err)=>{
            if (!err){
                res.status(200)
                res.json({
                    success:true,
                    message:"User status updated successfully"
                })
            }else{
                console.log(err)
                res.status(400)
                res.json({
                    success:false,
                    message:"User status not successfully updated"
                })
            }
        })
    }else{
        res.status(400)
        res.json({
            success:false,
            message:"Enter correct details"
        })
    }
})

//----------------------------VIEW USERS AND FILTER---------------------------------------------------------------------//
app.get('/Users', passport.authenticate('jwt', {session:false}), (req,res)=>{
    console.log(req.user)
    id= req.params.id;
    let role=req.query.role;
    let limit=req.query.limit;
    let isActive=req.query.isActive;
    if (limit){
        limit=parseInt(limit)
        console.log(limit)
    }else{
        limit=10
    }
    if (isActive){
        isActive=isActive
        console.log(isActive)

    }else{
        isActive=1
    }
    if (!role){
        mysqlConnection.query('select * from user u where u.isActive=? order by u.Date_Created DESC limit ?', [isActive, limit],  function(error,results,fields){
            console.log(results);
            if (results.length > 0){
                const data = JSON.parse(JSON.stringify(results));
                res.status(200)
                return res.json({
                    success:true,
                    data   
                });
            }else{
                res.status(400);
            }
        });
        
    }else{
        console.log(role)
        mysqlConnection.query('select * from user u, role r, user_role s where r.role_id=s.role_id and s.staff_id=u.staff_id and u.isActive=? and r.role_name=? order by u.Date_Created DESC limit ?', [isActive, role, limit],  function(error,results,fields){
            console.log(results);
            if (results.length > 0){
                const data = JSON.parse(JSON.stringify(results));
                res.status(200)
                return res.json({
                    success:true,
                    data   
                });
    
                
                
            }else{
                res.status(400);
            }
        });
    }
    


});

app.get('/count/Users', (req,res)=>{
    mysqlConnection.query('SELECT COUNT(Staff_Id) AS NumberOfUsers FROM user', function(error, results){
        if (!error){
            const data = JSON.parse(JSON.stringify(results));
            res.status(200)
            res.json({
            success:true,
            data
            })
        }else{
            res.status(400);
            res.json({
                success:false,
                message: 'Could not return number of users at this time'
            })
        }
    })
})

//----------------------------------------UPDATE USERS------------------------------------------------------------------//
app.put('/Users/:id', passport.authenticate('jwt', {session:false}), (req,res)=>{
    id = req.body.staff_id;
    username=req.body.username;
    firstname= req.body.firstname;
    lastname= req.body.lastname;
    email= req.body.email;
    role= req.body.roles;
    phonenumber= req.body.phonenumber;
    
    if (firstname && lastname && email && phonenumber && role && id && username){
        mysqlConnection.query('update user SET FirstName=?, LastName=?, Email=?, PhoneNumber=? where Staff_Id=?', [firstname, lastname, email, phonenumber, id], (err)=>{
            // ----------------------------Email update on credential----------------------------
            if (!err){
                mysqlConnection.query("update credential SET Email=? where UserName=?",[email,username], (err)=>{
                    if (!err){
                        console.log("Email updated");
                    }else{
                        console.log(err)
                    }
                });
                //update user roles

                mysqlConnection.query('Delete from user_role where Staff_Id=?', [id], (err)=>{
                    if (!err){
                        console.log("Deleted roles successfully")
                    }else{
                        console.log(err);
                    }
                
                })
                for (let j=0; j<role.length; j++){
                    console.log("here")
                    console.log(role[j])
                    rolename=role[j]
                    mysqlConnection.query('select role_id from role where role_name=?', [rolename], function(error,results,fields){
                        if (results.length>0){
                            console.log(results)
                            roleId=results[0].role_id
                            console.log('roleId is ' + roleId)
                            mysqlConnection.query("insert into user_role (Staff_Id, Role_Id) values ('"+id+"', '"+roleId+"')", (err)=>{
                                if (!err){
                                    console.log("role "+ role[j] + " inserted")
                                }else{
                                    console.log("role " + roleId + " not inserted")
                                }
                            })
                           
                            
                        }else{
                            console.log("roles not inserted")
                        }
                    }) 
                } 
                console.log("user roles added")
        
                res.status(201);
                res.json({
                    success:true,
                    message:"user updated"

                });
                res.end();
            }
            else
                console.log(err);
        });
        
    }else{
        res.json({
            success:false,
            message:"supply correct details"
        })
    }
})


//-----------------------------------------------  HANDLING ROLES ------------------------------------------------------//
app.post('/roles', passport.authenticate('jwt', {session:false}), (req,res)=>{
staffId= req.body.staff_id;
role=req.body.roles;
console.log(staffId)
console.log(role);
if (role && staffId){
    mysqlConnection.query('Delete from user_role where Staff_Id=?', [staffId], (err)=>{
        if (!err){
            console.log("Deleted roles successfully")
        }else{
            console.log(err);
        }
    
    })
    for (let j=0; j<role.length; j++){
        console.log("here")
        console.log(role[j])
        rolename=role[j]
        mysqlConnection.query('select role_id from role where role_name=?', [rolename], function(error,results,fields){
            if (results.length>0){
                console.log(results)
                roleId=results[0].role_id
                console.log('roleId is ' + roleId)
                mysqlConnection.query("insert into user_role (Staff_Id, Role_Id) values ('"+staffId+"', '"+roleId+"')", (err)=>{
                    if (!err){
                        console.log("role "+ role[j] + " inserted")
                    }else{
                        console.log("role " + roleId + " not inserted")
                    }
                })
               
                
            }else{
                console.log("roles not inserted")
            }
        }) 
    } res.json({
        success:true,
        message:"Role updated"
    })
    
} else{
    res.json({
        success:false,
        message:"Enter the right details"
    })
}
})

//----------------------------------------FORGOT PASSWORD-------------------------------------------------------------//
app.put('/forgotPassword', (req,res)=>{
    email= req.body.email;
    if (email){
        console.log(email);
        mysqlConnection.query('select * from credential where Email=?', [email], (err,results)=>{
            console.log(results);
            if (results.length>0){
                console.log("user exists");
                const randomstring = Math.random().toString(36).slice(-8);
                password= randomstring;
                console.log(password)
                bcrypt.genSalt(10, (err,salt)=> {
                    bcrypt.hash(password, salt, (err,hash) => {
                       // console.log(hash)
                        if (err) throw err;
                        password=hash;
                       console.log("password hashed" + password)
                       mysqlConnection.query("Update credential SET Password=? where email=?", [password,email], (err,results)=>{
                           if (!err){
                               res.status(200);
                               console.log('User Password Updated')
                                //--------------------------send email----------------------------------------------------------------
                                let transport = nodemailer.createTransport({
                                    host: 'smtp.mailtrap.io',
                                    port: 25,
                                    secure: false,
                                    
                                    auth: {
                                        // should be replaced with real sender's account
                                        user: '90d97788acb6ef',
                                        pass: 'e9fe5491a68bc7'
                                    }
                                });
                                let mailOptions = {
                                    // should be replaced with real  recipient's account
                                    from: 'noreplyKayar@gmail.com',
                                    to: 'oremei.akande@gmail.com',
                                    subject: 'Password Reset',
                                    text: 'You are receiving this message because you put in for a password reset. With this message is a temporary password. Login in to the site with it and reset your  password afterwards. Your temporary password is  ' + randomstring
                                };
                                transport.sendMail(mailOptions, (error, info) => {
                                    if (error) {
                                        return console.log(error);
                                    }
                                    console.log('Message %s sent: %s', info.messageId, info.response);
                                    res.json({
                                        sucess:true,
                                        message:"User password updated",
                                        data:randomstring
                                    })
                                    res.end()
                                });
                               
                           }else{
                               res.status(401)
                                res.json({
                                    sucess:false,
                                    message:"Password not updated"
                                })
                                res.end()
                           }
                       });
                    })
                });

               
            }else{
                res.status(401);
                res.json({
                    success:false,
                    message:"User does not exist"
                })
            }
        })
    }else{
        res.status(400);
        res.json({
            success:false,
            message:"Incorrect Details"
        })
    }
})

app.put('/passwordChange', passport.authenticate('jwt', {session:false}), (req,res)=>{
    username=req.body.username;
    oldPassword=req.body.oldPassword;
    password= req.body.newPassword;
    if (username && password){
        mysqlConnection.query('select * from credential where UserName=?',[username], (err,results)=>{
            if (results.length>0){
                console.log(password)
                mysqlConnection.query('Select Password from credential Where username=?', [username], function(error,results,row){
                    if (results.length >0 ){
                        db_password = results[0].Password;
                        comparepassword(oldPassword, db_password, (err, isMatch)=>{
                            if (err) throw err;
                            console.log(isMatch)
                            if (isMatch){
                                bcrypt.genSalt(10, (err,salt)=> {
                                    bcrypt.hash(password, salt, (err,hash) => {
                                       // console.log(hash)
                                        if (err) throw err;
                                        password=hash;
                                       console.log("password hashed" + password)
                                       mysqlConnection.query("Update credential SET Password=? where username=?", [password,username], (err,results)=>{
                                           if (!err){
                                               res.status(200)
                                               res.json({
                                                   sucess:true,
                                                   message:"User password updated"
                                               })
                                               res.end()
                                           }else{
                                               res.status(401)
                                                res.json({
                                                    sucess:false,
                                                    message:"Password not updated"
                                                })
                                                res.end()
                                           }
                                       });
                                    })
                                });
                            }else{
                                res.json({
                                    success:false,
                                    message:"old password does not match"
                                })
                                res.end()
                            }
                        })
                    }else{
                        res.json({
                            success:false,
                            message:"User does not exist"
                        })
                        res.end()
                    }
                })
                
            }else{
                res.status(401);
                res.json({
                    success:false,
                    message:"user does  not exist"
                })
            }
        })
    }else{
        res.status(401);
        res.json({
            success:false,
            message:"Incorrect Details"
        })
    }

    //bcrypt function
    function comparepassword(password, hash, callback){
        console.log('ordi pass ' + password)
        console.log('db pass ' + hash)
        bcrypt.compare(password, hash, (err, isMatch)=>{
            if (err) throw err
            callback(null, isMatch)
            
        })
    }
    
})

//----------------------------------------------------GET ROLE BY ID-----------------------------------------------------
app.get('/role/:id', passport.authenticate('jwt', {session:false}), (req,res)=>{
    id=req.params.id;
    roles=[]
    if (id){
        mysqlConnection.query('select r.role_name As Role from user u, role r, user_role s where u.Staff_Id=? and r.role_id=s.role_id and s.staff_id=u.staff_id', [id], function(error,results,fields){
            if (results.length>0){
                Object.keys(results).forEach(function(key) {
                    var row = results[key];
                    console.log(row.Role)
                    roles.push(row.Role)
                });
                // add property roles to the user object
                
                res.status(200);
                return res.json({
                    success:true,
                    roles   
                });
            }else{
                res.status(400);
                return res.json({
                    success:false,
                    message:"User not found"   
                });
            }
        });
    }else{
        res.status(400);
            return res.json({
                success:false,
                message:"roles not found"   
            });
    }
        
});


//------------------------------------------------------------port handler----------------------------------------------------------------------//

const port = process.env.PORT || 3000

app.listen(port, ()=> console.log(`listening on port ${port}...`));


//------------------------------------------------------------------------------------------------------------------------------------------//
//------------------------------------------------------------------------------------------------------------------------------------------------
// ASSETS MANAGEMENT-----------------------------------------------------------------------------------------------------------------------------
async function createItem(item){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{ 
        const result = await connection.execute("insert into item (Item_Name, Item_Desc) values ('"+item.itemName+"', '"+item.itemDesc+"')")
        console.log("item inserted with")
        console.log(result[0].insertId)
        data= result[0]
        return data
    }catch (err) {
          
        console.log(err)
        return err
        } 
    
}

async function createCategory(category){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{ 
        const result = await connection.execute("insert into category (Category_Name) values ('"+category+"')")
        console.log("category inserted")
        console.log(result[0].insertId)
        data= result[0]
        return data
    }catch (err) {
          
        console.log(err)
        return err
        } 
    
}
async function getCategoryByName(name){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('select * from category where Category_Name=?', [name]);
        console.log(result[0])
        let data= result
        return data

      } catch (err) {
          
        console.log(err)
        return err
    } 
}
async function getAllCategory(name){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('select * from category');
        console.log(result[0])
        let data= result
        return data

      } catch (err) {
          
        console.log(err)
        return err
    } 
}

async function createEvent(event){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        const result= await connection.execute("insert into events(item_id, quantity, type, location, received_by, brought_by, assigned_to, parent_id, Status, subDescription, Comment, Category) values ('"+event.item_id+"', '"+event.quantity+"', '"+event.type+"', '"+event.location+"', '"+event.received_by+"', '"+event.brought_by+"', '"+event.assigned_to+"', '"+event.parent_id+"', '"+event.status+"', '"+event.subDesc+"', '"+event.comment +"', '"+event.category +"')")
        console.log(result)
        data=result[0]
        return data
    }catch (err){
        console.log(err)
        return err
    }
    
}

async function updateEvent(id){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        const result = await connection.execute('update events SET is_leaf=? where id=?',[0,id])
        console.log("update heere")
        console.log(result)
        return result
    }catch (err){
        return err
    }
    
}

async function getEventById(id){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('select * from events where id=?', [id]);
        console.log(result[0])
        let data= result
        return data

      } catch (err) {
          
        console.log(err)
        return err
        } 
}

async function getItemById(id){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('select * from events where is_leaf=1 and item_id=?', [id]);
        console.log(result[0])
        let data= result
        return data

      } catch (err) {
          
        console.log(err)
        return err
    } 
}

async function getItemByName(itemName){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('select * from item where item_Name=?', [itemName]);
        //console.log(JSON.stringify(result[0][0].Item_Id))
        console.log(result)
        //console.log(JSON.stringify(result[0]))
        let data= result
        return data

      } catch (err) {
          
        console.log(err)
        return err
        } 
}

async function getAllItems(){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('SELECT item.item_id,item.item_Name,item.item_Desc, SUM(events.quantity) AS Quantity FROM item INNER JOIN events ON item.item_id = events.item_id where is_leaf=1 GROUP BY item.item_id');
        let data= result
        return data

      } catch (err) {
          
        console.log(err)
        return err
        } 
}

async function splitEvent(event){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        const data=[]
        let  leftQuantity = parseInt(event.eventQty)-parseInt(event.assQty);
        event1={}
        event2={}
        event1.item_id=event.itemId;
        event1.quantity=event.assQty
        event1.type='split'
        event1.location=event.assLocation
        event1.received_by="None"
        event1.brought_by='None'
        event1.assigned_to='not assigned'
        event1.parent_id= event.eventId
        
        await createEvent(event1)
        .then(data=>{
            if (data.insertId){
                console.log("Event1 created")
                event1.lastId=data.insertId
            }else{
                console.log("Event1 not created")
            }
        });
        
        data.push(event1)
        event2.item_id=event.itemId;
        event2.quantity=leftQuantity
        event2.type='split'
        event2.location=event.eventLocation
        event2.received_by="None"
        event2.brought_by='None'
        event2.assigned_to='not assigned'
        event2.parent_id= event.eventId
        data.push(event2)
        console.log(data)
        await createEvent(event2)
        .then(data=>{
            if (data.insertId){
                console.log("Event2 created")
            }else{
                console.log("Event2 not created")
            }
        })
        await updateEvent(event1.parent_id)
        .then(result=>{
            if (result){
                console.log("Parent node affected")
            }else{
               console.log("Parent Node not affected")
            }
        })
        
        return data
    }catch (err){
        console.log(err)
    }

}
async function assignEvent(event, username){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        event.assigned_to=username
        console.log(event.assigned_to)
        event.parent_id=event.lastId
        console.log(event.parent_id)
        event.type='assign'
        await createEvent(event)
        .then(data=>{
            if (data.insertId){
                console.log('assigned successfully')
            }else{
                console.log("user not assigned")
            }
        });
        await updateEvent(event.lastId)
        .then(result=>{
           if (result){
                console.log("Parent node affected")
            }else{
               console.log("Parent Node not affected")
            }
        })
        data="success"
        return data
    }catch (err){
        console.log(err)
    }
}



//------------------------------------------------Get Asset ById------------------------------------------------------//
app.get('/Assets/:id', passport.authenticate('jwt', {session:false}), (req,res)=>{
    id=req.params.id;
    if (id){
        getItemById(id)
        .then(data=>{
            if (data.length>0){
                let item = JSON.parse(JSON.stringify(data[0]));
                res.status(200)
                res.json({
                    success:true,
                    item
                })
            }else{
                res.status(400)
                res.json({
                    success:false,
                    message:"User not found"
                })
            }
        })
    }else{
        res.status(400)
        res.json({
            success:false,
            message:"Enter Correct details"
        })
    }
    
})
//------------------------------------Get All Asset------------------------------------------------------------------//
app.get('/Assets', passport.authenticate('jwt', {session:false}), (req,res)=>{
    getAllItems()
    .then(data=>{
        if (data.length>0){
            let items = JSON.parse(JSON.stringify(data[0]));
            res.status(200),
            res.json({
                success:true,
                items
                
            })
        }else{
            res.status(400)
            res.json({
                success:false,
                message:"Could not fetch users"
            })
        }
    })
    
})

//-----------------------------------------------Create Asset---------------------------------------------------------//
app.post('/Assets', passport.authenticate('jwt', {session:false}), (req,res)=>{  
    itemDesc= req.body.itemDescription
    itemName=req.body.itemName
    quantity= req.body.quantity
    location=req.body.location
    receivedBy= req.body.receivedBy
    broughtBy=req.body.broughtBy
    status=req.body.status
    category=req.body.category
    comment=req.body.comment
    if (comment==""){
        comment="no comment"
    }else{
        comment=comment
    }
    if (itemDesc && itemName && quantity && location && broughtBy && status && receivedBy&&category){
        type='add'
        event={}
        event.type=type;
        event.quantity=quantity
        event.location=location
        event.received_by=receivedBy
        event.brought_by=broughtBy
        event.assigned_to="None"
        event.status=status
        event.category=category
        event.comment=comment
        event.parent_id="Parent Node"
        event.subDesc=itemDesc
        item={}
        item.itemDesc=itemDesc
        item.itemName=itemName

        getCategoryByName(category)
        .then(data=>{
            if (data[0].length>0){
                console.log("Category exists")

            }else{
                createCategory(category)
                .then(data=>{
                    if (data.insertId){
                        console.log("category created")
                    }else{
                        console.log("category not created")
                    }
                });
            }
        })
        getItemByName(itemName)
        .then(data => {
            if (data[0].length>0){
                console.log("item already exists")
                id= JSON.stringify(data[0][0].Item_Id)
                event.item_id= id;
                console.log(event.item_id)
                createEvent(event)
                .then(data => {
                if (data.insertId){
                    res.json({
                        success:true,
                        message:"Item created"
                    })
                }else{
                    res.status(400)
                    res.json({
                        success:false,
                        message:"Item not created"
                    })
                }
                }); 
            }else{
                createItem(item)
                .then(data => {
                    if (data.insertId){
                        event.item_id=data.insertId
                        createEvent(event)
                        .then(data => {
                            if (data.insertId){
                                res.json({
                                    success:true,
                                    message:"Item created"
                                })
                            }else{
                                //res.status(400)
                                console.log("item lot not created")
                            }
                        }); 
                    }else{
                        res.status(400)
                        res.json({
                            success:false,
                            message:"Item not created"
                        })
                    }
                }); 
            }
        });
    }else{
        res.status(400)
        res.json({
            success:false,
            message:'Enter correct details please'
        })
    }
     
    
})
//------------------------------------------Assign Asset----------------------------------------------------------------//
app.post('/Assign/:id', passport.authenticate('jwt', {session:false}), (req,res)=>{
    eventId= req.body.event_id;
    assQty= req.body.assign_quantity;
    itemId=req.params.id
    assLocation = req.body.location
    username=req.body.staff_username
    status= req.boy.status
    category=req.boy.category
    comment=req.body.comment
    event={}
    //if (eventId && assQty && itemId && assLocation && username && status && category && )
    if (eventId && assQty){
        getEventById(eventId)
        .then(data=>{
            if (data.length>0){
                event.eventId=eventId
                event.assQty=assQty
                event.eventQty= JSON.stringify(data[0][0].quantity)
                event.eventLocation= JSON.stringify(data[0][0].location)
                event.assLocation=assLocation;
                event.itemId=itemId
                // don't forget to add conditionals to compare eventqty and assqty
                splitEvent(event)
                .then(data=>{
                    if (data.length>0){
                        assign=data[0]
                        console.log("yea")
                        console.log(assign)
                        assignEvent(assign,username)
                        .then(data=>{
                            if (data=="success"){
                                res.status(200)
                                res.json({
                                    success:true,
                                    message:"Asset assigned successfully"
                                })
                            }
                        })
                    }else{
                        res.status(400)
                        res.json({
                            success:false,
                            message:"Asset not assigned"
                        })
                    }
                })
            }else{
                res.status(400)
                res.json({
                    success:false,
                    message:"Event not found"
                })
            }
        })
    }
    

})
//------------------------------------------Update Asset----------------------------------------------------------------//
//app.post()