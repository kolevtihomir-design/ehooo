# AWS Lambda

```bash
cd lambda
sam build && sam deploy --guided
```

Или zip + upload:

```bash
cd lambda && zip function.zip index.mjs
aws lambda create-function --function-name ai-pokupki \\
  --runtime nodejs20.x --handler index.handler \\
  --architectures arm64 --zip-file fileb://function.zip \\
  --role arn:aws:iam::ACCOUNT:role/lambda-ex
aws lambda create-function-url-config --function-name ai-pokupki --auth-type NONE
```

Invoke:
```json
{"action":"platforms.search","q":"compressor"}
{"action":"warehouse.sync"}
{"action":"status"}
```
