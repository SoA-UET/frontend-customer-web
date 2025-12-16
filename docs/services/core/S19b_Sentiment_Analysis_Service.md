# S19b. Sentiment Analysis Service

This service has already been completed.

## This Service's API

This API is HTTP based. And it is generally fast.

The request and response body are in plain-text,
not JSON.

Assuming that the service is hosted
at `localhost:8135`, here are the ways
to consume it:

```sh
curl http://localhost:8135/v1/infer --http1.1 -X POST -H 'Content-Type: text/plain' -d 'Xin chào các bạn yêu quý! Chúng tôi rất trân trọng tình cảm của các bạn...
Hôm nay mọi người có vui không ạ?
Hãy cho phép tôi được giới thiệu bản thân nhé!'
```

which should output `Positive`. Or:

```sh
curl http://localhost:8135/v1/infer --http1.1 -X POST -H 'Content-Type: text/plain' -d 'Làm ăn cái kiểu gì đấy hả?'
```

which should output `Negative`. Or:

```sh
curl http://localhost:8135/v1/infer --http1.1 -X POST -H 'Content-Type: text/plain' -d 'Ừ anh biết rồi, nói chung cũng tạm được :>'
```

which should output `Neutral` (or `Positive`, depending on training set). Or:

```sh
curl -s --write-out "\n\n<<< HTTP Code: %{http_code} >>>\n" http://localhost:8135/v1/infer --http1.1 -X POST
```

which should output:

    No input text?

    <<< HTTP Code: 400 >>>

The protocol is, you expect to get 200 and response
body `Positive`, `Negative`, `Neutral`; or some
other HTTP code, in which case the response body
contains the error message.
