# Telcenter Core - Conversation Analysis Service

Introducing the series of Telcenter Engineering.

Telcenter, on the surface, is a semi-automated telecom services call center -
it is a web app that offers telecommunication services consultation. People
are serviced by the AI Agent, and they will be forwarded to in-person
consultants if the AI detected down mood, rage, or that it could not answer
the question itself given a pre-fed ground truth database. Now, we are
designing this as microservices. Telcenter Core would act as the main backend
for the end-user interface, and it consists of multiple microservices.
Telcenter Partner is another system that is deployed separately on each of
the telecom partner's servers, and it is responsible for taking up forwarded
conversations and continuing them with the real persons in-charge. Together,
one Core and several Partner systems cooperate to deliver the best customer
experience, while lowering cost dramatically, with the help of automated AI
responses.

The general deployment and communication topology is like this:

    Core <---(Internet)---> (Partner_1, Partner_2..., Partner_N)

The users' inquiries and answers to those are primarily in Vietnamese.

Now, you are designing the Conversation Analysis Service, in Python.
This service is inside the Core system.

Here are the peer services that this service may interact with. We will come up
with the flow of this service itself later.

- **S01 - Consultation Service:** The service that is responsible for
    mediating the users' inquiries and responses. It also holds
    the conversations database.

- **S19b - Sentiment Analysis Service:** The service that is responsible
    for analyzing the sentiment of a given text. It returns `Positive`,
    `Negative`, or `Neutral`.

## A Note on API Transport Layers

The APIs of the services (including this one
and the peers) might be based on HTTP and/or
RabbitMQ transport protocols. One service might
also exposes multiple APIs of different kinds.

HTTP is mostly used in APIs that are exposed
to the frontend web apps, though it occasionally
is used for internal communication between
microservices, too. HTTP APIs are somewhat
RESTful (it is CRUD, stateless, versioned,
and HATEOAS, but it need not follow
Code-on-Demand requirements.)

For APIs that are based on RabbitMQ transport,
each API usually demands two queues, the
requests queue and the responses queue. The
caller would send requests into the former queue
and expect the responses to come out from the
latter. Exceptions will be explicitly noted.
The default queue names will be specified for
each such API. The queue names should be configurable
via `.env`, too.

## Peer Service APIs

Note that the base URL to call the services
must be specified via `.env`. Construct
a `.env.example` file for that.

### S01 - Consultation Service

[A36](../../api_groups/A36.md)

### S19b - Sentiment Analysis Service

[S19b](./S19b_Sentiment_Analysis_Service.md)

## The Flows

### Flow 1: On New Message

1. S01 notifies this service (S19)
    via A36a event `new_message`
    whenever there is a new message in
    any conversation. This event includes
    the conversation ID, the message ID,
    the current customer satisfaction score
    of that conversation, the current summary
    of the conversation, the content
    of the message, the sender type,
    among other things.

2. This service (S19) calls S19b
    via its HTTP API to obtain the sentiment
    analysis result of that message's content.

3. This service (S19) notifies S01
    via A36b event `update_message_emotion`
    about the sentiment analysis result
    of that message.

4. S19 computes the new customer satisfaction
    score of that conversation. The method
    of computation is given below.

    Then, S19 notifies S01
    via A36b event `update_customer_satisfaction`
    about the updated customer satisfaction
    score of that conversation.

5. S19 also re-write the summary
    of that conversation, using the method
    given below.

    Then, S19 notifies S01
    via A36b event `update_conversation_summary`
    about the updated summary of that conversation.

### Flow 2: On Rating Changed

1. S01 notifies this service (S19)
    via A36a event `rating_changed`
    whenever the customer changes
    the rating of any conversation.
    Rating ranges from `1` to `5`.

2. S19 notifies S01
    via A36b event `update_customer_satisfaction`
    about the updated customer satisfaction
    score of that conversation. The
    new score is *equal* to the new rating.

### Customer Satisfaction Computation

The customer satisfaction score is an integer
ranging from `1` to `5`, inclusive.

Given the current customer satisfaction score
`curr_score` and the sentiment analysis result
`sentiment` of the new message, the new customer
satisfaction score `new_score` is computed as follows:

- if `sentiment` is `Negative`:
        new_score = floor(0.5 * (curr_score + 1))

- if `sentiment` is `Positive`:
        new_score = ceil(0.5 * (curr_score + 5))

- if `sentiment` is `Neutral`:
        new_score = max(curr_score, ceil(0.5 * (curr_score + 3)))

### Conversation Summary Rewriting

If the new message is from customer (i.e. `sender_type == 'CUSTOMER'`),
the new summary is the old summary appended with the new message's content,
like this:

    summary = summary + "\nKhách hàng: XXX\n"

Otherwise, the old summary is concatenated with the new message's `sender_type`
and `content`, then fed into Gemini LLM
with a prompt like this:

    Tóm tắt đoạn hội thoại sau đây giữa khách hàng và đại lý tư vấn viễn thông.
    Bản tóm tắt phải ngắn gọn, súc tích, đầy đủ ý chính, và bằng tiếng Việt.
    Đoạn hội thoại:

    {full_conversation_text}

The response from Gemini LLM
is the new summary.

There must be an environment variable
`GEMINI_API_KEY` that holds the API key
to call Gemini LLM. Specify it in `.env.example`.

## This Service's APIs

[A36](../../api_groups/A36.md)

## Technology

- Python
- Use `uv` as the virtual environment and package manager.
- Multithreaded logic should be used for performance, since this
    component relies a lot on other services, which means the API calls
    to those services take up very much time. So this service is I/O bound.
    Note that, using multithreading to emulate async operations is very
    important - but do NOT use `async` and `await` in Python - that would
    be a mess!

- The class `MessageQueueService` must be used for RabbitMQ communication (which internally
    use `pika`).

    The class is [located in this file](../../app/services/MessageQueueService.py).

    An example of using this class [is given here](../MessageQueueService-usage-example.py).

    Also, for multithreading, only use the scheme in that file.
    Any other use of multithreading, if necessary, must strictly
    look for hazards - use locks and other synchronization primitives
    where appropriate.

- If this service needs to expose HTTP API(s), use Flask.

- The program entry point is [in this file](../../app/__main__.py).
