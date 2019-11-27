else{
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
