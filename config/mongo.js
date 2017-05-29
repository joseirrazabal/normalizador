import mongoose from 'mongoose'
mongoose.Promise = global.Promise

mongoose.connect('mongodb://localhost/mediadb')

export default mongoose
