const mysqlConnection = require('../database'); 

async function getAsset(id){
    const result = await mysqlConnection.query('Select * from Item whereid=?', [id]);
    if (result[0].length>0){
        throw new Error ('Item with this Id was not found');
    }
    return result[0][0];
}

async function getAllAssets(){
    const result = await mysqlConnection.query('Select * from item');
    return result[0];
}

async function createItem(id, description, category, status){
    await mysqlConnection.query( 'INSERT INTO item SET ?', {description, category, status});
}

async function getCategoryById(id){
    const result= await mysqlConnection('SELECT * FROM CATEGORY where category_id IN (?', [id]);
    return result[0]; 
}

async function batchingThings(){
    const connection= await pool.getConnection();
    await connection.beginTransaction();

    try{
        await connection.query('');
        await connection.query('');

        await connection.commit();
    }catch (err) {
        await connection.rollback();
        throw err;
    }finally {
        connection.release
    }
}