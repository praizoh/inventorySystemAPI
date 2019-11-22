const express = require('express');
const mysql = require('mysql');
// const mysql2= require('mysql2/promise');
// const connection = mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
const app = express();
const bodyparser = require('body-parser');
const passport = require('passport')
const path = require('path')
const nodemailer = require("nodemailer"); 
const fs = require('fs');

// require paparse
const papaparse= require("papaparse")
// app.use(bodyparser.urlencoded({
//   extended: true
// }));
app.use(bodyparser.json());
const cors = require('cors');
app.use(cors())
app.use(passport.initialize());
app.use(passport.session());
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
// const busboy = require("then-busboy");
 const fileUpload=require('express-fileupload')
 app.use(fileUpload())

 //set static folder
 app.use(express.static(path.join(__dirname, 'public')));
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
                    bcrypt.genSalt(10, (err,salt)=> {
                        bcrypt.hash(password, salt, (err,hash) => {
                            if (err) throw err;
                            password=hash;
                        console.log("password hashed " + password)
                            mysqlConnection.query("insert into user (FirstName, LastName, UserName, Email, PhoneNumber) values ('"+firstname+"','"+lastname+"', '"+username+"', '"+email+"', '"+phonenumber+"')", (err, results)=>{
                            
                                if (!err){
                                    
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
                                        res.status(201);
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
            res.status(401);
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
                            //res.status(200)
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
                                                        res.status(200)
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
                        res.json("User not found")
                    }
                });
                
                
            }else{
                res.status(401);
                res.json("User details not correct")
            }
        });


    })

    //the url below activates or deactivates a user
    app.put('/status/:staffId', passport.authenticate('jwt', {session:false}), (req,res)=>{
        id= req.params.staffId
        console.log(id)
        if (id){
            mysqlConnection.query('Select isActive from user where staff_id=?', [id], function(err,results,fields){
                console.log(results)
                if (results.length > 0){
                    isActive=results[0].isActive
                    newIsActive=!isActive
                    mysqlConnection.query('Update user SET isActive=? where staff_id=?', [newIsActive, id], (err)=>{
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
                    res.status(401)
                    res.json("User not found")
                }
            })
        
        }else{
            res.status(409)
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
        let name=req.query.name;
        console.log(name)
        if (!name){
            name="%"
        }
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
            mysqlConnection.query('select * from user u where u.isActive=? and (u.LastName like "%' +name+'%" or u.FirstName like "%' +name+'%")order by u.Date_Created DESC limit ?', [isActive, limit],  function(error,results,fields){
                console.log(results);
                console.log(results.length)
                if (results.length > 0){
                    const data = JSON.parse(JSON.stringify(results));
                    res.status(200)
                     res.json({
                        success:true,
                        data   
                    });
                }else{ 
                    res.status(400);
                     res.json({
                        success:false,
                        message:"Users not found"
                    })
                    res.end()
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
    app.post('/Users', passport.authenticate('jwt', {session:false}), (req,res)=>{
        console.log(req.body)
        console.log(req.body.username)
        id = req.body.staff_id;
        username=req.body.username;
        firstname= req.body.firstname;
        lastname= req.body.lastname;
        email= req.body.email;
        role= JSON.parse(req.body.roles);
        console.log(role) 
        phonenumber= req.body.phonenumber;
        console.log(phonenumber)
        //handle images
        random = Math.random().toString(36).slice(-8);
           if (!req.files){
           Image = ""
           }
            else{
                file = req.files.Image;
                Image = random+req.files.Image.name;
                file.mv('public/images/users/'+Image);
                console.log("Image")
                console.log(Image)
            }
        if (firstname && lastname && email && phonenumber && role && id && username){
            mysqlConnection.query('update user SET FirstName=?, LastName=?, Email=?, PhoneNumber=?, Image=? where Staff_Id=?', [firstname, lastname, email, phonenumber, Image, id], (err)=>{
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
            
                    res.status(200);
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
            res.status(400)
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
                                        service: 'gmail',
                                        auth: {
                                            // should be replaced with real sender's account
                                            user: 'oremei.akande@gmail.com',
                                            pass: 'oremei@akande'
                                        }
                                    });
                                    let mailOptions = {
                                        // should be replaced with real  recipient's account
                                        from: 'noreplyKayar@gmail.com',
                                        to: 'sumbomatic@gmail.com',
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
                                            message:"User password updated. Check your mail for password",
                                            data:randomstring
                                        })
                                        res.end()
                                    });
                                
                            }else{
                                res.status(400)
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
        randomstring=password
        if (username && password){
            mysqlConnection.query('select * from credential where UserName=?',[username], (err,results)=>{
                if (results.length>0){
                    console.log(password)
                    mysqlConnection.query('Select * from credential Where username=?', [username], function(error,results,row){
                        if (results.length >0 ){
                            db_password = results[0].Password;
                            email= results[0].Email;
                            console.log(results)
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
                                                    //--------------------------send email----------------------------------------------------------------
                                                    let transport = nodemailer.createTransport({
                                                        service: 'gmail',
                                                        auth: {
                                                            // should be replaced with real sender's account
                                                            user: 'oremei.akande@gmail.com',
                                                            pass: 'oremei@akande'
                                                        }
                                                    });
                                                    let mailOptions = {
                                                    // should be replaced with real  recipient's account
                                                    from: 'noreplyKayar@gmail.com',
                                                    to: email,
                                                    subject: 'Password Reset',
                                                    text: 'Voilla!!! Your password was successfully changed. With this message is a temporary password. Your new password is  ' + randomstring
                                                        };
                                                    transport.sendMail(mailOptions, (error, info) => {
                                                        if (error) {
                                                            return console.log(error);
                                                        }
                                                        console.log('Message %s sent: %s', info.messageId, info.response);
                                                        res.status(200)
                                                        res.json({
                                                            sucess:true,
                                                            message:"User password updated. Check your mail for password",
                                                            data:randomstring
                                                        })
                                                        res.end()
                                                    });
                                            }else{
                                                res.status(400)
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
                                    res.status(409)
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
    app.get('/role/:staffId', passport.authenticate('jwt', {session:false}), (req,res)=>{
        id=req.params.staffId;
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
            res.status(409);
                return res.json({
                    success:false,
                    message:"roles not found"   
                });
        }
            
    });

//----------------------------------------------------------------------------user end----------------------------
//------------------------------------------------------------port handler----------------------------------------------------------------------//

const port = process.env.PORT || 5000

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
async function createItem_Category(item_id, category_id){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{ 
        const result = await connection.execute("insert into item_category (item_id, category_id) values ('"+item_id+"','"+category_id+"')")
        console.log("category_item inserted")
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
async function getCategoryByItemId(id){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('select * from item_category join category on item_category.Category_Id=category.Category_Id where item_category.Item_Id=?', [id]);
        console.log(result)
        let data= result
        return data

      } catch (err) {
          
        console.log(err)
        return err
    } 
}
async function getCatItemByCatIdItemId(catId,itemId){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('select * from item_category where item_category.Category_Id=? and item_category.Item_Id=?', [catId,itemId]);
        console.log("-----------------------------------------------------------------------------------------------")
        console.log(result)
        let data= result
        return data

      } catch (err) {
          
        console.log(err)
        return err
    } 
}
async function getAllCategory(){
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
    if (!event.requestId){
        event.requestId=0
    }
    
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        if (event.is_Assigned){
            const result= await connection.execute("insert into events(item_id, quantity, type, location, received_by, brought_by, assigned_to, parent_id, Status, subDescription, Comment, Category, requestId,is_Assigned) values ('"+event.item_id+"', '"+event.quantity+"', '"+event.type+"', '"+event.location+"', '"+event.received_by+"', '"+event.brought_by+"', '"+event.assigned_to+"', '"+event.parent_id+"', '"+event.Status+"', '"+event.subDescription+"', '"+event.Comment +"', '"+event.Category +"', '"+event.requestId +"', '"+event.is_Assigned +"')")
            console.log(result)
            data=result[0]
            return data
        }else{
            const result= await connection.execute("insert into events(item_id, quantity, type, location, received_by, brought_by, assigned_to, parent_id, Status, subDescription, Comment, Category, requestId) values ('"+event.item_id+"', '"+event.quantity+"', '"+event.type+"', '"+event.location+"', '"+event.received_by+"', '"+event.brought_by+"', '"+event.assigned_to+"', '"+event.parent_id+"', '"+event.Status+"', '"+event.subDescription+"', '"+event.Comment +"', '"+event.Category +"', '"+event.requestId +"')")
        console.log(result)
        data=result[0]
        return data
        }
        
    }catch (err){
        console.log(err)
        return err
    }
    
}

async function staffAsset(staff_name){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('select * from events e, item i where e.assigned_to=? and e.is_Leaf=1 and e.item_id=i.Item_Id', [staff_name]);
        console.log(result[0])
        let data= result
        return data

    } catch (err) {
          
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
async function updateEventStatus(id,status){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        const result = await connection.execute('update events SET Status=? where id=?',[status,id])
        console.log("update heere")
        console.log(result)
        return result
    }catch (err){
        return err
    }
    
}

async function updateRequest(id,status, responded_by,qty){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        //const result = await connection.execute('update events SET is_leaf=? where requestId=?',[0,id])
        now=new Date(new Date().toString().split('GMT')[0]+' UTC').toISOString().split('.')[0]
        let data = await connection.execute('update request SET status=?, responded_by=?, res_date=? where id=?',[status,responded_by,now,id])
        let result = await connection.execute('update item_request SET qty_granted=? where id=?',[qty,id])
        console.log("update request")
        data="success"
        return data
    }catch (err){
        return err
    }
    
}

async function getEventById(id){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('select * from events where id=?', [id]);
        let data= result
        return data

      } catch (err) {
          
        console.log(err)
        return err
        } 
}

async function getItemById(id, is_Assigned){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    const lot=[]
    try {
        const result =await connection.execute('select * from events e, item t  where  e.assigned_to Like ? and e.is_leaf=1 and e.item_id=t.item_id and e.item_id=?', [is_Assigned,id]);
        console.log(result[0])
        let data= result
        if (data.length>0){ 
            //SELECT assigned_to FROM `events` WHERE assigned_to LIKE '%none%' and is_leaf=1
            item = JSON.parse(JSON.stringify(data[0]));
            for (let k=0; k<item.length; k++){
                await getlotSerialNumber(item[k].id)
                .then(data=>{
                    if (data.length>0){
                        let serialNumber=JSON.parse(JSON.stringify(data[0]));
                        item[k].serialNumbers=serialNumber
                        lot.push(item[k])
                    }
                })
            }
        }
        console.log("printing lot")
        console.log(lot)
        return lot

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

async function getAllItems(limit,name){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('SELECT item.item_id,item.item_Name,item.item_Desc, SUM(events.quantity) AS Quantity FROM item INNER JOIN events ON item.item_id = events.item_id where events.is_leaf=1 and item.Item_Name like "%' + name + '%" GROUP BY item.item_id order by item.Date_Created DESC limit ?', [limit]);
        let data= result
        return data

      } catch (err) {
        console.log(err)
        return err
        } 
}


async function compare(arr1, arr2){
    try {
        var filtered = arr1.filter(
            function(e) {
              return this.indexOf(e) < 0;
            },
            arr2
        );
        console.log(filtered);
        data=filtered;
        return data
      } catch (err) {
        console.log(err)
        return err
        } 
}
async function processUpdateSerialNumberArray(array,id,eventId) {
    id=id
    eventId=eventId
    for (const item of array) {
      await delayedUpdateSN(item,id,eventId);
    }
    console.log('Done!');
    data='success'
    return data
}
async function delayedUpdateSN(item,id, eventId){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
       
        
            let result = await connection.execute('update item_serialn SET lotId=? where serialNumber=? and lotId=?',[id,item, eventId])
            console.log(result)
            data='success'
            return data
        
    }catch (err){
        return err
    }
    
}
async function UpdateSN(newId, eventId){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
       
        
            let result = await connection.execute('update item_serialn SET lotId=? where  lotId=?',[newId, eventId])
            console.log(result)
            data='success'
            return data
        
    }catch (err){
        return err
    }
    
}
//updates lotId given the serialnumbers and eventId to anew eventId
async function updateSerialNumber(arr,id, eventId){
    id=id
    eventId=eventId
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        procUpdate= await processUpdateSerialNumberArray(arr,id,eventId)
        if (procUpdate=='success'){
            console.log("update request")
            data="success"
            return data
        }
        
    }catch (err){
        return err
    }
    
}

//updates the lotId to a new lotId given the old and new eventId without the serial  numbers
async function updateLotIdforSerialNumbers(id, eventId){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        console.log('serial')
        console.log(arr)
        console.log(id)
        console.log(eventId)
        // for (m=0; m<arr.length; m++){
        //     sn=arr[m]
        //     console.log(sn)
            let data = await connection.execute('update item_serialn SET lotId=? where lotId=?',[id,eventId])
        // }
        console.log("update request")
        data="success"
        return data
    }catch (err){
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
        assignedSerialNumbers=event.assignedSerialNumbers;
        eventId=event.eventId
        lotSN=[]
        remSN=[]    //remaining serial number
        assignedId=''
        remId=''
        // getting the serialNumbers of the lot from the item_serialn table
        if (assignedSerialNumbers){
            lotgetSN= await getlotSerialNumber(eventId)
            
                if (lotgetSN.length>0){
                    JSON.stringify(lotgetSN[0][0].quantity)
                    for (let k=0; k<lotgetSN[0].length; k++){
                        SN= JSON.stringify(lotgetSN[0][k].serialNumber)
                        lotSN.push(SN);
                    }
                    lotCompare= await compare(lotSN, assignedSerialNumbers)
                    
                        //push the remaining serial numbers to remSN array: remainingSerialNumber
                        for (let k=0; k<lotCompare.length; k++){
                            SN= lotCompare[k]
                            remSN.push(SN);
                        }
                    
                }
           
        }
       
        //------continue normal operation on splitting-----
        event1.item_id=event.itemId;
        event1.quantity=event.assQty
        event1.type='split'
        event1.location=event.assLocation
        event1.received_by="None"
        event1.brought_by='None'
        event1.assigned_to='not assigned'
        event1.parent_id= event.eventId
        event1.Status=event.Status
        event1.Category=event.Category
        event1.subDescription=event.subDescription
        event1.Comment=event.Comment
        
        await createEvent(event1)
        .then(data=>{
            if (data.insertId){
                console.log("Event1 created")
                event1.lastId=data.insertId
                event1.eventId=data.insertId
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
        event2.Status=event.Status
        event2.Category=event.Category
        event2.subDescription=event.subDescription
        event2.Comment=event.Comment
        console.log(data)
        await createEvent(event2)
        .then(data=>{
            if (data.insertId){
                console.log("Event2 created")
                event2.eventId=data.insertId
            }else{
                console.log("Event2 not created")
            }
        })
        data.push(event2)
        await updateEvent(event1.parent_id)
        .then(result=>{
            if (result){
                console.log("Parent node affected")
            }else{
               console.log("Parent Node not affected")
            }
        })
        await updateSerialNumber(assignedSerialNumbers,data[0].eventId, eventId)
        .then(data=>{
            if (data=="success"){
                console.log('Serial1 updated')
            }
        })
        await updateSerialNumber(remSN,data[1].eventId, eventId)
        .then(data=>{
            console.log('remSn')
            if (data=="success"){
                console.log('Serial2 updated')
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
        event.parent_id=event.lastId
        event.type='assign'
        event.is_Assigned=1
        eveCreate= await createEvent(event)
        
            if (eveCreate.insertId){
                console.log('assigned successfully')
                SNupdateHere=await UpdateSN(eveCreate.insertId,event.lastId)
                if (SNupdateHere=='success'){
                    console.log("new serial number updated")
                }else{
                    console.log("new serial number not updated")
                }
            }else{
                console.log("user not assigned")
            }
        

        
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

async function getRequestById(id){ 
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('select * from request r, item_request i, item t  where r.id=i.request_id and i.item_id=t.Item_Id and r.id=?', [id]);
        // select * from request r, item_request i, item t where r.id=i.request_id and i.item_id=t.Item_Id and r.id=16
        console.log(result[0])
        let data= result
        return data

      } catch (err) {
          
        console.log(err) 
        return err
    } 
}
async function getAllRequest(limit){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('SELECT * from request limit ?', [limit]);
        let data= result
        return data

      } catch (err) {
          
        console.log(err)
        return err
        } 
}
async function createRequest(username,comment){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        const result= await connection.execute("insert into request(requested_by,comment) values ('"+username+"', '"+comment+"')");
                data=result[0]
                return data
           
        
    }catch (err){
        console.log(err)
        return err
    }
    
}   
async function createitemRequest(requestId,itemId,quantity){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        const result= await connection.execute("insert into item_request(item_id,qty_requested,request_id) values ('"+itemId+"', '"+quantity+"', '"+requestId+"')");
        
               console.log(result)
                data=result[0]
                return data
           
        
    }catch (err){
        console.log(err)
        return err
    }
    
}   
async function createLotSerialNumbers(lotId, serialNum){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{
        const result= await connection.execute("insert into item_serialn(lotId,serialNumber) values ('"+lotId+"', '"+serialNum+"')");
        
               console.log(result)
                data=result[0]
                return data
           
        
    }catch (err){
        console.log(err)
        return err
    }
    
}   
async function getlotSerialNumber(id){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('select * from item_serialn where lotId=?', [id]);
        let data= result
        return data

      } catch (err) {
          
        console.log(err)
        return err
    } 
}


function delay() {
    return new Promise(resolve => setTimeout(resolve, 300));
}
  
async function delayedLog(item,username, requestId, requestStatus, assLocation, comment, responded_by) {
    // notice that we can await a function
    // that returns a promise
    username=username;
    requestId=requestId;
    requestStatus=requestStatus;
    assLocation=assLocation;
    comment=comment
    responded_by=responded_by
    await delay();
    console.log(item.event_id);
            eventId= item.event_id; //id of the lot
            assQty= item.assign_quantity; //number of quantity to be assigned
            itemId=item.itemId //id of the item or asset
            itemSN= item.assignedSerialNumbers //array of serial numbers to be assigned if exists
            console.log(eventId, assQty, itemId, itemSN)
            event={}
            if (eventId && assQty){
                getEvent= await getEventById(eventId)
                
                    if (getEvent.length>0){
                        event.eventId=eventId
                        event.assQty=assQty
                        event.eventQty= getEvent[0][0].quantity
                        event.eventLocation= getEvent[0][0].location
                        console.log("eventLocation")
                        console.log(event.eventLocation)
                        event.assLocation=assLocation;
                        event.itemId=itemId
                        event.Status= getEvent[0][0].Status
                        event.Category=getEvent[0][0].Category
                        event.subDescription=getEvent[0][0].subDescription
                        event.Comment=getEvent[0][0].Comment
                        if (itemSN){
                            event.assignedSerialNumbers=itemSN
                        }   
                    
                        // don't forget to add conditionals to compare eventqty and assqty
                        eventSplit= await splitEvent(event)
                        
                            if (eventSplit.length>0){ 
                                assign=eventSplit[0]
                                eventAssign= await assignEvent(assign,username)
                               
                                    if (eventAssign=="success"){
                                        console.log('data')
                                        console.log(eventAssign)
                                        console.log(requestStatus)
                                        console.log(requestId)
                                        console.log(responded_by)
                                        if (requestStatus==="ACCEPTED"){
                                            requestUpdate= await updateRequest(requestId,requestStatus,responded_by, assQty)
                                            
                                                console.log(requestUpdate)
                                                console.log(requestStatus)
                                                console.log(requestId)
                                                console.log(responded_by)
                                                if (requestUpdate==="success"){
                                                    console.log("Request updated")
                                                    
                                                }else{
                                                    console.log("Request not updated")
                                                
                                                }
                                                
                                            
                                        }
                                        
                                    }
                                
                            }else{
                                console.log("Asset not assigned")
                                
                            }
                        
                    }else{
                        console.log("Event not found")
                        
                    }
                
                
            }
}
  
async function processArray(array,username, requestId, requestStatus, assLocation, comment, responded_by) {
    username=username;
    requestId=requestId;
    requestStatus=requestStatus;
    assLocation=assLocation;
    comment=comment
    responded_by=responded_by
    for (const item of array) {
      await delayedLog(item,username, requestId, requestStatus, assLocation, comment,responded_by);
    }
    console.log('Done!'); 
    return data="success" 
}

async function createNotification(subject, body, sender, link_type, link_type_id,to){
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try{ 
        const result = await connection.execute("insert into notifications (subject, body, sender, link_type, link_type_id, recipient) values ('"+subject+"','"+body+"','"+sender+"','"+link_type+"','"+link_type_id+"','"+to+"')")
        console.log("notification inserted")
        console.log(result[0].insertId)
        data= result[0]
        return data
    }catch (err) {
          
        console.log(err)
        return err
        } 
    
}
async function getAllNotification(limit,is_Read,to){
    console.log(is_Read)   
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('SELECT * from notifications where is_read like ? and recipient like ? order by date_sent DESC limit ?', [is_Read,to,limit]);
        let data= result
        console.log(data)
        return data   

    } catch (err) {
        console.log(err)     
        return err
    } 
}
async function getAllNotificationCount(is_Read,to){
    console.log(is_Read)   
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('SELECT COUNT(*) AS NumberOfNotifications from notifications where is_read like ? and recipient like ? order by date_sent DESC', [is_Read,to]);
        let data= result
        console.log(data)
        return data   

    } catch (err) {
        console.log(err)     
        return err
    } 
}
// SELECT COUNT(requested_by) AS NumberOfRequest FROM request where requested_by=?'
async function getNotificationById(id){
     
    const mysql2= require('mysql2/promise');
    const connection = await mysql2.createConnection({host:'localhost', user: 'root', database: 'inventory_management_system'});
    try {
        const result =await connection.execute('SELECT * from notifications where id=?', [id]);
        let data= result
        console.log(data)
        return data   

    } catch (err) {  
        console.log(err)     
        return err
    } 
}
async function processCsvArray(array) {
    for (const item of array) {
      await assetsLog(item);
    }
    console.log('Done!'); 
    return data="success" 
}
async function processSerialNumberArray(lotId, serialNumber) {
    lotId=lotId
    for (const item of serialNumber) {
        
      await delayedSerialNumber(lotId,item);
    }
    console.log('Done!');
    data="success"
    return data
}
async function delayedSerialNumber(lotId,item){
    lotId=lotId
    await delay()
    await createLotSerialNumbers(lotId,item)
        .then(data=>{
            if (data.insertId){ 
                console.log("Lots serial number created")
            }else{
                console.log("Lots serial number not created")
            }
        })
}
async function processCategoryArray(category,id) {
    id=id
    console.log(id)
    console.log("category")
    console.log(category)
    for (const item of category) {

            console.log(item)
      await delayedCategory(item,id);
    }
    console.log('Done!');
    data="success"
    return data
}
async function delayedCategory(item,id){
    await delay()
        getCategoryByName(item)
        .then(data=>{
            if (data[0].length>0){
                console.log("Category exists")
                cat_id= JSON.stringify(data[0][0].Category_Id)
                getCatItemByCatIdItemId(cat_id,id)
                .then(data=>{
                    if (data[0].length>0){
                        console.log("category Item EXits")
                    }else{
                        createItem_Category(event.item_id, cat_id)
                        .then(data=>{
                            if (data.insertId){
                                console.log("category_item created")
                            }else{
                                console.log("category_item not created")
                            }
                        });
                    }
                })
                

            }else{
                createCategory(item)
                .then(data=>{
                    if (data.insertId){
                        cat_id=data.insertId
                        console.log('we herererrer')
                        createItem_Category(event.item_id, cat_id)
                        .then(data=>{
                            if (data.insertId){
                                console.log("category_item created")
                            }else{
                                console.log("category_item not created")
                            }
                        });
                        
                        item_cat.push(data.insertId)
                        console.log("category created")
                        console.log(item_cat)
                    }else{
                        console.log("category not created")
                    }
                });
            }
        })
    
}
async function assetsLog(item){
    await delay();
    console.log(item);
    itemDesc= item.Description
    itemName=item.Name
    quantity= item.Quantity
    location=item.Location
    receivedBy= item.ReceivedBy
    broughtBy=item.BroughtBy
    status=item.Status
    category=item.Category
    comment=item.Comment
    serialNumber=item.SerialNumber
    if (comment=="" || !comment){
        comment="no comment"
    }else{
        comment=comment
    }
    if (itemDesc && itemName && quantity && location && broughtBy && status && receivedBy && category){
        type='add'
        event={}
        event.type=type;
        event.quantity=quantity
        event.location=location
        event.received_by=receivedBy
        event.brought_by=broughtBy
        event.assigned_to="not assigned"
        event.Status=status
        event.Category=category
        event.Comment=comment
        event.parent_id="Parent Node"
        event.subDescription=itemDesc
        item={}
        
        item.itemDesc=itemDesc
        item.itemName=itemName
        item_cat=[]
        
        
        name= await getItemByName(itemName)
        if (name[0].length>0){
            console.log("item already exists")
            const id= JSON.stringify(name[0][0].Item_Id)
            event.item_id= id;
            console.log(event.item_id)
            eventCreate= await createEvent(event)
            if (eventCreate.insertId){
                lotId=data.insertId
                SN= await processSerialNumberArray(lotId,serialNumber)
                if (SN=="success"){
                    console.log("created successfully")
                }else{
                    console.log("Not created successfully: SERIALNUMBERS")
                }
                console.log("item created")
            }else{
                console.log("iitem not created")
            }
            //add category and insert category_item
            cat= processCategoryArray(category,id)
            if (cat=="success"){
                console.log('Category created')
            }
        }else{
            const itemCreate= await createItem(item)
            if (itemCreate.insertId){
                create_id=itemCreate.insertId
                event.item_id=itemCreate.insertId
                //add category and insert category_item
                procCat=await processCategoryArray(category,create_id)
                if (procCat=='success'){
                    console.log('Category created')
                }
                creEvent=await createEvent(event)
                if (creEvent.insertId){
                    lotId=creEvent.insertId
                    procSerial= processSerialNumberArray(lotId,serialNumber)
                    if (procSerial=='success'){
                        console.log("Lots serial number created")
                    }else{
                        console.log("Lots serial number not created")
                    }
                    console.log("item lot created")
                }else{
                    console.log("item lot not created")
                }
            }else{
                console.log("item lot not created")
            }
        }                 
    }else{
       console.log("correct values should be entered")
    }
}

//------------------------------------------------Get Asset ById------------------------------------------------------//
app.get('/Assets/:id', passport.authenticate('jwt', {session:false}), (req,res)=>{
    id=req.params.id;
    is_Assigned=req.query.is_Assigned
    //if it has is_assigneed= truue send all asseeets else send those not assigneed
    if (!is_Assigned){
        is_Assigned='%'
    }else{
        is_Assigned='not assigned'
    }
    lot={}
    if (id){    
        getItemById(id,is_Assigned)
        .then(lot=>{
            if (lot.length>0){
                res.status(200)
                res.json({
                    success:true,
                    lot
                })
               
                
            }else{
                res.status(400)
                res.json({
                    success:false,
                    message:"Asset not found"
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
    let limit=req.query.limit;
    name=req.query.itemName
    if (!name){
        name="%"
    }
    if (limit){
        limit=parseInt(limit)
        console.log(limit)
    }else{
        limit=10;
    }  
    getAllItems(limit, name)
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
                message:"Could not fetch items"
            })
        }
    })
    
})

//-----------------------------------------------Create Asset---------------------------------------------------------//
app.post('/Assets', passport.authenticate('jwt', {session:false}), (req,res)=>{  
    console.log(req.body)
    if (!req.files){ 
        itemDesc= req.body.itemDescription
        itemName=req.body.itemName
        quantity= req.body.quantity
        location=req.body.location
        receivedBy= req.body.receivedBy
        broughtBy=req.body.broughtBy
        status=req.body.status
        category=req.body.category
        comment=req.body.comment
        serialNumber=req.body.serialNumber
        if (comment=="" || !comment){
            comment="no comment"
        }else{
            comment=comment
        }
            if (itemDesc && itemName && quantity && location && broughtBy && status && receivedBy && category){
                type='add'
                event={}
                event.type=type;
                event.quantity=quantity
                event.location=location
                event.received_by=receivedBy
                event.brought_by=broughtBy
                event.assigned_to="not assigned"
                event.Status=status
                event.Category=category
                event.Comment=comment
                event.parent_id="Parent Node"
                event.subDescription=itemDesc
                item={}
                
                item.itemDesc=itemDesc
                item.itemName=itemName
                item_cat=[]
                
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
                            lotId=data.insertId
                            for (let k=0; k<serialNumber.length; k++){
                                createLotSerialNumbers(lotId,serialNumber[k])
                                .then(data=>{
                                    if (data.insertId){ 
                                        console.log("Lots serial number created")
                                    }else{
                                        console.log("Lots serial number not created")
                                    }
                                })
                            }
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
                            //add category and insert category_item
                                for (let j=0; j<category.length; j++){
                                    console.log(category[j])
                                    getCategoryByName(category[j])
                                    .then(data=>{
                                        if (data[0].length>0){
                                            console.log("Category exists")
                                            cat_id= JSON.stringify(data[0][0].Category_Id)
                                            createItem_Category(event.item_id, cat_id)
                                            .then(data=>{
                                                if (data.insertId){
                                                    console.log("category_item created")
                                                }else{
                                                    console.log("category_item not created")
                                                }
                                            });
        
                                        }else{
                                            createCategory(category[j])
                                            .then(data=>{
                                                if (data.insertId){
                                                    cat_id=data.insertId
                                                    console.log('we herererrer')
                                                    createItem_Category(event.item_id, cat_id)
                                                    .then(data=>{
                                                        if (data.insertId){
                                                            console.log("category_item created")
                                                        }else{
                                                            console.log("category_item not created")
                                                        }
                                                    });
                                                    
                                                    item_cat.push(data.insertId)
                                                    console.log("category created")
                                                    console.log(item_cat)
                                                }else{
                                                    console.log("category not created")
                                                }
                                            });
                                        }
                                    })
                                }
                            
                                createEvent(event)
                                .then(data => {
                                    if (data.insertId){
                                        lotId=data.insertId
                                        for (let k=0; k<serialNumber.length; k++){
                                            createLotSerialNumbers(lotId,serialNumber[k])
                                            .then(data=>{
                                                if (data.insertId){
                                                    console.log("Lots serial number created")
                                                }else{
                                                    console.log("Lots serial number not created")
                                                }
                                            })
                                        }
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
        }else{           
            file=req.files.csvDoc
            // console.log(file)
            // console.log('file') 
            array=req.body.assets
            processCsvArray(array)
            .then(data=>{
                if (data=="success"){
                    res.status(200)
                    res.json({
                        success:true,
                        message:"Assets created"
                    })
                }else{
                    res.json({
                        success:false,
                        message:"Assets not creeated"
                    })
                }
            })
        
        }
    
     
    
})
//------------------------------------------Assign Asset----------------------------------------------------------------//
app.post('/Assign', passport.authenticate('jwt', {session:false}), (req,res)=>{
    assets=req.body.assets;
    username=req.body.staff_username //staff to be assigned to
    requestId=req.body.requestId; 
    requestStatus=req.body.requestStatus
    comment=req.body.comment
    if (!comment){
        comment= "Check your dashboard for those that has been assigned to you"
    }
    assLocation = req.body.location //location of the assigned item or lot
    responded_by=req.body.storeKeeperUsername
    console.log(responded_by)
      //to create notification and return response
    const subject= 'Assigned Assets';
    const body= 'Request for assets has been reviewed. '+ comment
    const sender= responded_by
    const link_type= 'assign_asset'
    const to= "username"
    const link_type_id= requestId; 
    createNotification(subject, body, sender, link_type, link_type_id,to)
    .then(data=>{
        if (data.insertId){
            console.log('Notification inserted')
        }else{
            console.log('Notification not inserted')
        }
        
    })

    if ((requestStatus=="ACCEPTED" && requestId) || requestStatus=="Nill Request"){
         // processArray(assets, username, requestId, requestStatus, assLocation, comment)
         console.log("hi")
         if (requestStatus=="Nill Request"){
             requestId=0
         }
         console.log(assets, username, requestId, requestStatus, assLocation, comment, responded_by)
         processArray(assets, username, requestId, requestStatus, assLocation, comment, responded_by)
         .then(data=>{
             if (data=="success"){
                 res.status(200)
                 res.json({
                 success:true,
                 message:"Asset assigned successfully"
             })
             }else{
                 res.status(400)
                 res.json({
                 success:false,
                 data
         })
             }
         })
         
     }else{ 
         
         if (requestStatus=="NOT GRANTED" && requestId){
             qty=0
             updateRequest(requestId,requestStatus, responded_by,qty)
             .then(data=>{
                 if (data=="success"){
                     res.status(200) 
                     res.json({
                         success:true,
                         message:"Request updated"
                     })
                 }else{
                     res.status(400)
                     res.json({
                         success:false,
                         message:"Request not updated"
                     })
                 }
                 
             })
         }else{
             res.status(401)
             res.json({
                 success:false,
                 message:"Enter correct details"
             })
             res.end()
         }
  }
    
 })
//------------------------------------------Staff Asset----------------------------------------------------------------//
//=============================================getAsset owned by a staff============================================
app.get('/Staff/Asset/:staffName', passport.authenticate('jwt', {session:false}), (req,res)=>{
    console.log("here")
    staffName=req.params.staffName;
    console.log(staffName)
    if (staffName){
        staffAsset(staffName)
        .then(data=>{
            if (data.length>0){
                let items = JSON.parse(JSON.stringify(data[0]));
                NumberOfStaffAsset=0;
                for (j=0; j<items.length; j++){
                    NumberOfStaffAsset++
                }
                res.status(200)
                res.json({
                    success:true,
                    items,
                    NumberOfStaffAsset
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

//======================================count assets in the system. All is leaf lots============================================================
app.get('/count/Assets', (req,res)=>{
    mysqlConnection.query('SELECT SUM(quantity) AS NumberOfAssets FROM events where is_leaf=1', function(error, results){
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
                message: 'Could not return number of assets at this time'
            })
        }
    })
})

//-------------------------------------------GET CATEGORIES--------------------------------------------------------------\\
app.get('/category', (req,res)=>{
    getAllCategory()
    .then(data=>{
        if (data.length>0){
            let categories = JSON.parse(JSON.stringify(data[0]));
            res.status(200),
            res.json({
                success:true,
                categories
                
            })
        }else{
            res.status(400)
            res.json({
                success:false,
                message:"Could not fetch categories"
            })
        }
    })
})
//======================================Get Categories By AssetId=========================================================
app.get('/category/:assetId', (req,res)=>{
    id=req.params.assetId
    getCategoryByItemId(id)
    .then(data=>{
        if (data[0].length>0){
            let categories = JSON.parse(JSON.stringify(data[0]));
            console.log(categories)
            res.status(200),
            res.json({
                success:true,
                categories
                
            })
        }else{
            res.status(400)
            res.json({
                success:false,
                message:"Could not fetch categories"
            })
        }
    })
})
//=================================================Update Asset Cateeegoory======================================
app.put('/category', passport.authenticate('jwt', {session:false}), (req,res)=>{
    itemId= req.body.itemId;
    category=req.body.category;
    if (category && itemId){
    mysqlConnection.query('Delete from item_category where Item_Id=?', [itemId], (err)=>{
        if (!err){
            console.log("Deleted category successfully")
        }else{
            console.log(err);
        }
    
    })
    for (let j=0; j<category.length; j++){
        console.log(category[j])
        getCategoryByName(category[j])
        .then(data=>{
            if (data[0].length>0){
                console.log("Category exists")
                cat_id= JSON.stringify(data[0][0].Category_Id)
                createItem_Category(itemId, cat_id)
                .then(data=>{
                    if (data.insertId){
                        console.log("category_item created")
                    }else{
                        console.log("category_item not created")
                    }
                });
            }else{
                createCategory(category[j])
                .then(data=>{
                    if (data.insertId){
                        cat_id=data.insertId
                        console.log('we herererrer')
                        createItem_Category(itemId, cat_id)
                        .then(data=>{
                            if (data.insertId){
                                console.log("category_item created")
                            }else{
                                console.log("category_item not created")
                            }
                        });
                        
                        item_cat.push(data.insertId)
                        console.log("category created")
                        console.log(item_cat)
                    }else{
                        console.log("category not created")
                    }
                });
            }
        })
    }
    res.status(200)
    res.json({
        success:true,
        message:'Category Updated'
    })
    
    } else{
        res.json({
            success:false,
            message:"Enter the right details"
        })
    }
    })

//----------------------------------REQUEST------------------------------------------------------------------------------//
//=============================================post requests====================================================
app.post('/request', passport.authenticate('jwt', {session:false}), (req,res)=>{
    requested_by=req.body.staffUsername
    comment=req.body.comment
    if (!comment){
        comment="no comment"
    }
    items=req.body.items
    const request ={}
    console.log(items)
    createRequest(requested_by,comment)
    .then(data=>{
        if (data.insertId){
            const requestId=data.insertId
            request.requestId=requestId
            for (let j=0; j<items.length; j++){
                item_id=items[j].itemId
                req_quantity=items[j].quantity
        
                if(requested_by && item_id && req_quantity){
                    // if (!comment){
                    //     comment="no comment"
                    // }
                    createitemRequest(requestId,item_id,req_quantity)
                    .then(data=>{
                        if (data.insertId){
                            console.log('Request inserted')
                        }else{
                            console.log('request not inserted')
                        }
                    })
                }else{
                    res.status(400)
                    res.json({
                        success:false,
                        message:"Enter the correct details"
                    })
                    res.end()
                }
            }
            const subject= 'Request for assets';
            const body= comment
            const sender= requested_by
            const link_type= 'item_req'
            const link_type_id= request.requestId;
            const to="storekeeper"
            createNotification(subject, body, sender, link_type, link_type_id,to)
            .then(data=>{
                if (data.insertId){
                    console.log('Notification inserted')
                }else{
                    console.log('Notification not inserted')
                }
                
            }) 
            res.status(200) 
            res.json({ 
                success:true,
                message:"Request Made"
            })
        }else{
            res.status(400)
            res.json({
                success:false,
                message:"request not inserted"
            })
        }
    })

})      
//===========================gets all request======================================================================
app.get('/request', passport.authenticate('jwt', {session:false}), (req,res)=>{
    limit=req.query.limit
    if (!limit){
        limit=5;
    }
    getAllRequest(limit)
    .then(data=>{
        if (data.length>0){
            let requests = JSON.parse(JSON.stringify(data[0]));
            res.status(200)
            res.json({
                success:true,
                requests
            })
        }else{
            res.status(400);
            res.json({
                success:false,
                message:"could not fetch request data"
            })

        }
    })
})
//===========================================get a request by Id. Contains all assets for a request===============
app.get('/request/:id',passport.authenticate('jwt', {session:false}), (req,res)=>{
    id=req.params.id;
    getRequestById(id)
    .then(data=>{
        if (data.length>0){
            let requests = JSON.parse(JSON.stringify(data[0]));
            res.status(200)
            res.json({
                success:true,
                requests
            })
        }else{
            res.status(400);
            res.json({
                success:false,
                message:"could not fetch request data"
            })

        }
    })
})
//=================gives the total count of request made by a staff================================================
app.get('/request/staff/:id',passport.authenticate('jwt', {session:false}), (req,res)=>{
    id=req.params.id;
    mysqlConnection.query('SELECT COUNT(requested_by) AS NumberOfRequest FROM request where requested_by=?',[id], function(error, results){
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
//=============================================Uppdate assets===================================================
//========================================================= =======================================================
app.put('/Assets', passport.authenticate('jwt', {session:false}), (req,res)=>{  
    itemDesc= req.body.itemDescription
    itemName=req.body.itemName
    category=req.body.category
    itemId=req.body.itemId
    
    if (itemDesc && itemName && itemId && category){
        getItemByName(itemName)
        .then(data => {
            if (data[0].length>0){
                console.log("item already exists")
                res.status(400)
                res.json({
                    success:false,
                    message:"Item Name already exists. Pick another Name"
                })           
            }else{
                updateAssetById()
                .then(data=>{
                    if (data==success){
                        res.status(200);
                        res.json({
                            success:true,
                            message:'Asset Updated'
                        })
                    }else{
                        res.status(400)
                        res.json({
                            success:false,
                            meessage:'Asset not updated'
                        })
                    }
                })
            } 
        })
     
    }
})
//=========================================================Notifications=================================================
//=============================================get all notifications==============================================
app.get('/notification', passport.authenticate('jwt', {session:false}), (req,res)=>{
    limit=req.query.limit
    is_Read=req.query.is_Read
    to=req.query.to
    console.log(to)
    console.log(is_Read)    
    if (!limit){
        limit=5;
    }
    if (!is_Read){
        is_Read='%'
    }
    if (to){
        getAllNotification(limit,is_Read, to)
        .then(data=>{
            if (data.length>0){
                let notifications = JSON.parse(JSON.stringify(data[0]));
                res.status(200)
                res.json({
                    success:true, 
                    notifications
                })
            }else{
                res.status(400);
                res.json({
                    success:false,
                    message:"could not fetch notification data"
                })
    
            }
        })
    }else{
        res.status(400)
        res.json({
            success:false,
            message:"Enter the recipient of this notification"
        })
    }
  
})

//===============================================get the total count of notification===========================
app.get('/notification/count', passport.authenticate('jwt', {session:false}), (req,res)=>{
    
    is_Read=req.query.is_Read
    to=req.query.to
    console.log(to)
    console.log(is_Read)    
    if (!is_Read){
        is_Read='%'
    }
    if (to){
        getAllNotificationCount(is_Read, to)
        .then(data=>{
            if (data.length>0){
                let count = JSON.parse(JSON.stringify(data[0]));
                res.status(200)
                res.json({
                    success:true, 
                    count
                })
            }else{
                res.status(400);
                res.json({
                    success:false,
                    message:"could not fetch notification data"
                })
    
            }
        })
    }else{
        res.status(400)
        res.json({
            success:false,
            message:"Enter the recipient of this notification"
        })
    }
  
})
//================================================update notification when read and who read it-================
app.put('/notification/:notificationId', passport.authenticate('jwt', {session:false}), (req,res)=>{
    id= req.params.notificationId
    staffUsername=req.body.staffUsername
    now=new Date(new Date().toString().split('GMT')[0]+' UTC').toISOString().split('.')[0]
    console.log(id)
    if (id && staffUsername){
        mysqlConnection.query('Select is_read from notifications where id=?', [id], function(err,results,fields){
            console.log(results)
            if (results.length > 0){
                isRead=results[0].is_read
                newIsRead=!isRead
                if (isRead=='0'){
                    mysqlConnection.query('Update notifications SET is_read=?, read_by=?, date_read=? where id=?', [newIsRead, staffUsername, now, id], (err)=>{
                        if (!err){
                            res.status(200)
                            res.json({
                                success:true,
                                message:"Notification status updated successfully. If newIsRead is false, message has been unread else it has been read",
                                newIsRead
                                
                            })
                        }else{
                            console.log(err)
                            res.status(400)
                            res.json({
                                success:false,
                                message:"Notification status not successfully updated"                     
                            })
                        }
                    })
                }else{
                    mysqlConnection.query('Update notifications SET is_read=?, read_by=?, date_read=? where id=?', [newIsRead, '', '0000-00-00:00-00-00', id], (err)=>{
                        if (!err){
                            res.status(200)  
                            res.json({
                                success:true,
                                message:"Notification status updated successfully. If newIsRead is false, message has been unread else it has been read",
                                newIsRead
                                
                            })
                        }else{
                            console.log(err)
                            res.status(400)
                            res.json({
                                success:false,
                                message:"Notification status not successfully updated"
                            })
                        }
                    })
                }
                
            }else{
                res.status(401)
                res.json("Notification not found")
            }
        })
    
    }else{
        res.status(409)
        res.json({
            success:false,
            message:"Enter correct details"
        })
    }
})
//===============================get Notification By Id=========================================================
app.get('/notification/:id', passport.authenticate('jwt', {session:false}), (req,res)=>{
    id=req.params.id
    getNotificationById(id)
    .then(data=>{
        if (data.length>0){
            let notification = JSON.parse(JSON.stringify(data[0]));
            res.status(200)
            res.json({
                success:true, 
                notification
            })
        }else{
            res.status(400);
            res.json({
                success:false,
                message:"could not fetch notification data"
            })

        }
    })
})

//=================================gets the total number of assigned assets==========================================
app.get('/assignedAssetCount', (req,res)=>{
    mysqlConnection.query('SELECT SUM(quantity) AS NumberOfAssignedAssets FROM events where is_leaf=1 and is_assigned=1', function(error, results){
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
                message: 'Could not return number of assets at this time'
            })
        }
    })
})

//=======================================get lots ======================================================================
app.get('/lot', (req,res)=>{
    is_Assigned=req.query.is_Assigned
    if (!is_Assigned){
        res.status(200)
        res.json({
        success:true,
        message:"isAssigned or not assigned"
        })
    }else{
        mysqlConnection.query('SELECT *  FROM events,item where is_leaf=1 and is_assigned=? and events.item_id=item.Item_Id',[is_Assigned], function(error, results){
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
                    message: 'Could not return assigned assets at this time'
                })
            }
        })
    }
    
})

//====================================get the total number of requests made in the system============================================
app.get('/requestCount', (req,res)=>{
    status=req.query.status
    if (!status){
        status='%'
    }else{ 
        status= status
    }
    mysqlConnection.query('SELECT COUNT(id) AS NumberOfRequest FROM request where status like ?',[status], function(error, results){
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
                message: 'Could not return number of requests at this time'
            })
        }
    })  
    
})
//===============================deAssign An ASSet from a staff=======================================================
app.post('/unAssign/:event_id',passport.authenticate('jwt', {session:false}), (req,res)=>{
    eventId=req.params.event_id; 
    staff=req.body.staffUsernameToBeUnassigned
    storeKeeper=req.body.storeKeeperUsername
      //to create notification and return response
      const subject= 'Unassignment of Asset ' + eventId;
      const body= 'Asset with id= ' +eventId + ' has been unassigned from you'
      const sender= storeKeeper
      const link_type= 'unassign_asset'
      const to= staff
      const link_type_id= eventId;
      createNotification(subject, body, sender, link_type, link_type_id,to)
      .then(data=>{
          if (data.insertId){
              console.log('Notification inserted')
          }else{
              console.log('Notification not inserted')
          }
          
      })
    event={}
    getEventById(eventId)
    .then(data=>{
        if (data.length>0){
            let requests = JSON.parse(JSON.stringify(data[0][0]));
            event.item_id=requests.item_id
            event.quantity=requests.quantity
            event.type="Unassign"
            event.location=requests.location
            event.received_by=requests.received_by
            event.brought_by=requests.brought_by
            event.assigned_to="not assigned"
            event.parent_id=eventId
            event.Status=requests.Status
            event.Category=requests.Category
            event.subDescription=requests.subDescription
            event.Comment="Unassigned by " + storeKeeper
            createEvent(event)
            .then(data=>{
                if (data.insertId){
                    console.log('insert Id')
                    console.log(data.insertId)
                    //change the SN to new eventId 
                    UpdateSN(data.insertId,eventId)
                    .then(data=>{
                        if (data=='success'){
                            console.log("new serial number updated")
                        }else{
                            console.log("new serial number not updated")
                        }
                    })
                    
                    updateEvent(eventId)
                    .then(result=>{
                        console.log(data)
                        if (result){
                            res.status(200)
                            res.json({
                                success:true,
                                message:"Asset Unassigned"
                            })
                        }else{
                            console.log('dint updATE EVENT')
                        }
                    })
                }else{
                    console.log('event not created')
                } 
            })

           
        }else{
            res.status(400);
            res.json({
                success:false,
                message:"could not fetch request data"
            })

        }
    })
})

//=======================================================Update Assets Status===========================================
app.put('/Asset/status', passport.authenticate('jwt', {session:false}), (req,res)=>{  
        itemId=req.body.eventId
        status=req.body.status
        comment=req.body.comment
    arr=[]
    getEventById(itemId)
    .then(data=>{
        if (data.length>0){
            console.log("Item exists")
            let item = JSON.parse(JSON.stringify(data[0][0]));
            console.log("status")
            console.log(item.Status)
            item.Status=status
            console.log(item.Status)
            item.parent_id=itemId
            item.is_Assigned=item.is_assigned
            console.log(item.is_Assigned)
            item.Comment=comment  
            item.type="Asset Status Update"
            arr.push(itemId)
            createEvent(item)
            .then(data=>{
                if (data.insertId){
                    newId =  data.insertId
                    UpdateSN(newId,itemId)
                    .then(data=>{
                        if (data=='success'){
                            console.log("new serial number updated")
                        }else{
                            console.log("new serial number not updated")
                        }
                    })
                    updateEvent(itemId)
                    .then(data=>{
                        if (data){
                            console.log("Event created")
                            
                        }else{
                            console.log("Event for asset status update not created")
                        }
                    })
                    console.log(arr, newId, itemId)
                   updateLotIdforSerialNumbers(newId, itemId)
                   .then(data=>{
                       if (data=="success"){
                           console.log("Serial Number Updated")
                           res.status(200)
                            res.json({
                                success:true,
                                message:"Event created for asset status update"
                            })
                       }else{
                           console.log(data)
                           console.log("serial Numbers not updated")
                       }
                   })
                    
                }else{
                    res.status(400)
                    res.json({
                        success:false,
                        message:"Event not created for asset status update"
                    })
                }
            })
            
            
        }else{
            res.status(400)
            res.json({
                success:false,
                message:"Could not get Item. It doesn't exist"
            })
        }
    })
    
    
   
})