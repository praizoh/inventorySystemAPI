const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const bodyparser = require('body-parser');
const passport = require('passport')
const path = require('path')
app.use(bodyparser.json());
const cors = require('cors');
app.use(cors())
app.use(passport.initialize());
app.use(passport.session());
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const db= require('../Database/database');
const mysqlConnection = db;

async function getUserById(id) {

    const result = await mysqlConnection.query('SELECT * from user Where Staff_Id = ?', [id]); 
    if (!result[0].length < 1) {
      throw new Error('Post with this id was not found');
    }
    return result[0][0];
  
  }

  async function getAllUser(){
      const result = await mysqlConnection.query('Select * from user');
      return result[0];
  }

  async function addUser(username, firstname, lastname, email, phonenumber){
      const result = mysqlConnection.query(
          'INSERT INTO user SET ?', {username, firstname, lastname, email, phonenumber}
          );
    }

//   async function addRole(roleId, staffId){
//     const result = mysqlConnection.query(
//         'INSERT INTO user SET ?', {username, firstname, lastname, email, phonenumber}
//         );

//         roleId = mysqlConnection.query('select Role_Id from role where Role_Name=?', [role], function(error, results){
//             if (!error){
//                 roleId=results[0].Role_Id;
//                 mysqlConnection.query("insert into user_role (Staff_Id, Role_Id) values (LAST_INSERT_ID(), '"+roleId+"')", (err)=>{
//                     //console.log(firstname);
//                     if (!err){
//                         res.status(201);
//                     }
//                     else
//                        console.log(err);
//                 });
//             }
//         })
// }
async function addCredential(username, email, password){
    const result = mysqlConnection.query(
        'INSERT INTO user SET ?', {username, email, password}
        );
  }

    