var express = require('express'),
    fs = require('fs'),
    path = require('path'),
    app = express();

app.use('/down', express.static(__dirname));

app.get('/get/*', function(req,res){
    var tmp_file = '',
        tmp_folder = '',
        ids = req.params,
        dir = '';

    for(var i in ids){
        dir = path.join(dir, ids[i]);
    }

    if(!fs.statSync(dir).isDirectory())
        return;

    fs.readdir(path.join(__dirname,dir), function(err, files){
        if(!!err){
            console.log(err);
        }else{
            for(var i in files){
                var file = files[i];
                var stats = fs.statSync(path.join(dir, file));

                if(stats.isFile()){
                    tmp_file += '<a href="/down/'+path.join(dir,file)+'">'+file+'</a><br/>';
                }else{
                    tmp_folder +='<a href="/get/'+path.join(dir,file)+'">['+file+']</a><br/>';
                }
            }
            res.send(tmp_folder + tmp_file );
        }
    });
});

app.listen(55555, function(){
    console.log('This server server is running on the port ' + this.address().port);
});