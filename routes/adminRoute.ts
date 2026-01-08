import { Router } from "express";
import mongoose from "mongoose";
import { User } from "../models";




const adminRoute = Router(); 

adminRoute.get("/analytics",async(req,res)=>{
    const payload = req.body.payload;

  if (!payload.userId || !mongoose.Types.ObjectId.isValid(payload.userId)){
        return res.status(400).json({
            success:false,
            error:"Invalid Schema"
        })
    }
 if (payload.role !== "admin"){
         return res.status(403).json({
            success:false,
            error:"Forbidden, insufficient permissions"
        })
    }
    
   const result = await User.aggregate().lookup({
        from:"Supervisor",
        localField: "role",
        foreignField:"role",
        as:"sup"
   })

//    console.log("normally",result);


})


export default adminRoute;