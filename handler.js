'use strict';

const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const fs = require('fs');
const exif = require('exif-parser');

module.exports.extractMetadata = (event, context, callback) => {

    for (var rec in event.Records) {
        console.log(event.Records[rec].s3);

        var s3Params = {
            Bucket: event.Records[rec].s3.bucket.name,
            Key: event.Records[rec].s3.object.key
        }

        s3.getObject(s3Params, function(err, data) {
            if (err) console.log(err, err.stack);
            else{
                console.log("DATA INCIO");
                console.log(data);
                console.log("DATA FIM");

                const parser = exif.create(data.Body);
                const result = parser.parse();

                console.log(result);

                var width = result.imageSize.width;
                var height = result.imageSize.height;

                var dbParams = {
                    TableName: process.env.DYNAMODB_TABLE,
                    Item: {
                        s3objectkey: event.Records[rec].s3.object.key.replace(/uploads\//g, ""),
                        content_length: event.Records[rec].s3.object.size,
                        height: height,
                        width: width
                    }
                }

                dynamoDb.put(dbParams, function (err, data) {
                    if (err) {
                        console.log(err);
                        callback(err, null);
                    }
                });
            }
          });
    }
    
    callback(null, {"message": "Success"});
};

module.exports.getMetadata = (event, context, callback) => {

    var params = {
        TableName: 'serverless-challenge-dev',
        Key: event.pathParameters
    }

    dynamoDb.get(params, function(err, data){
        if(err){
            callback(null, err);
        }else{
            var response = {
                statusCode: 200,
                body: JSON.stringify(data.Item)
            };
            
            callback(null, response);
        }
    });
};

module.exports.getImage = (event, context, callback) =>{

    var s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: 'uploads/' + event.pathParameters.s3objectkey
    }

    // var out = fs.createWriteStream("/tmp/test.jpg");
    // s3.getObject(s3Params).createReadStream().pipe(out)
    // .on('close', function(){
    //     console.log(data);

    //     callback(null,{
    //         statusCode: 200,
    //         headers: {
    //             'Content-type' : 'image/jpeg',
    //             'Accept': 'application/octet-stream'
    //         },
    //         body: out
    //     });
    // });


    var response = s3.getObject(s3Params, function(err, data){
        if(err) console.log(err, err.stack);
        else{
            console.log(data);

            callback(null, {
                statusCode: 200,
                headers: {'Content-type' : 'image/jpeg'},
                body: new Buffer(data.Body.toString(), 'binary').toString('base64'),
                // isBase64Encoded : true,
            });
        }
    });

    // console.log(response);

    // callback(null, {
    //     statusCode: 200,
    //     headers:  {'Content-type' : 'image/jpeg'},
    //     body: file,
    //     isBase64Encoded : true,
    // })

    // callback(null, {
    //     statusCode: 200,
    //     headers:  {'Content-type' : 'image/jpeg'},
    //     body: tempFile,
    //     isBase64Encoded : true,
    // });
};