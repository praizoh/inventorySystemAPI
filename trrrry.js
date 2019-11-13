async function asignSplit(item, username, requestId, requestStatus,assLocation,comment){
    username=username;
    requestId=requestId;
    requestStatus=requestStatus;
    assLocation=assLocation;
    comment=comment

    eventId= item.event_id; //id of the lot
    assQty= item.assign_quantity; //number of quantity to be assigned
    itemId=item.itemId //id of the item or asset
    itemSN= item.assignedSerialNumbers //array of serial numbers to be assigned if exists
    console.log(eventId, assQty, itemId, itemSN)
    event={}
    if (eventId && assQty){
        await getEventById(eventId)
        .then(data=>{
            if (data.length>0){
                event.eventId=eventId
                event.assQty=assQty
                event.eventQty= JSON.stringify(data[0][0].quantity)
                event.eventLocation= JSON.stringify(data[0][0].location)
                event.assLocation=assLocation;
                event.itemId=itemId
                if (itemSN){
                    event.assignedSerialNumbers=itemSN
                }
            
                // don't forget to add conditionals to compare eventqty and assqty
                splitEvent(event)
                .then(data=>{
                    if (data.length>0){ 
                        assign=data[0]
                        assignEvent(assign,username)
                        .then(data=>{ 
                            if (data=="success"){
                                if (requestStatus=="ACCEPTED"){
                                    updateRequest(requestId,requestStatus)
                                    .then(data=>{
                                        if (data=="success"){
                                            console.log("Request updated")
                                            
                                        }else{
                                            console.log("Request not updated")
                                        
                                        }
                                        
                                    })
                                }
                                
                            }
                        })
                    }else{
                        console.log("Asset not assigned")
                        
                    }
                })
            }else{
                console.log("Event not found")
                
            }
        })
        return v
    }
} 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 requestStatus=req.body.requestStatus
    requestId=req.body.requestId;
    if ((requestStatus=="ACCEPTED" && requestId) || requestStatus=="Nill Request"){
    eventId= req.body.event_id; //id of the lot
    assQty= req.body.assign_quantity; //number of quantity to be assigned
    itemId=req.params.id //id of the item or asset
    itemSN= req.body.assignedSerialNumbers //array of serial numbers to be assigned if exists
    assLocation = req.body.location //location of the assigned item or lot
    username=req.body.staff_username //staff to be assigned to
    status= req.body.status         
    category=req.body.category
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
                if (itemSN){
                    event.assignedSerialNumbers=itemSN
                    console.log(event.assignedSerialNumbers)
                }
               
                // don't forget to add conditionals to compare eventqty and assqty
                splitEvent(event)
                .then(data=>{
                    if (data.length>0){
                        res.status(200)
                        assign=data[0]
                        assignEvent(assign,username)
                        .then(data=>{
                            if (data=="success"){
                                console.log("data is " + data )
                                if (requestStatus=="ACCEPTED"){
                                    updateRequest(requestId,requestStatus)
                                    .then(data=>{
                                        console.log(data)
                                        if (data=="success"){
                                            console.log("Request updated")
                                            
                                        }else{
                                            console.log("Request not updated")
                                        
                                        }
                                        
                                    })
                                }
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
    
    }else{
        
       if (requestStatus=="NOT GRANTED" && requestId){
            updateRequest(requestId,requestStatus)
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