
require('dotenv').config();
const express = require('express'); 
const app = express();
const usersRouter = require('./routes/users'); 


app.use(express.json()); 


app.use('/users', usersRouter);


const port = process.env.PORT || 3000;


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
