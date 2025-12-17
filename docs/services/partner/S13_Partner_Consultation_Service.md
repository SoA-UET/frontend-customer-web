# Telcenter Partner - Partner's Consultation Service (S13)

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

Now, you are designing the Partner's Consultation Service service, in Python.
This service is inside the Telcenter Partner system.

Here are the peer services that this service may interact with. We will come up
with the flow of this service itself later.

- S01: Core's Consultation Service

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

### S01

[A10](../../api_groups/A10.md)

## This Service's APIs

A10 (above)

[H31](../../api_groups/H31.md)

## The Flows

This service supports the following use cases:

- TP-17: Tiếp nhận yêu cầu tư vấn văn bản chuyển từ Core
- TP-18: Tiếp nhận cuộc gọi thoại chuyển từ Core
- TP-21: Xem lịch sử các phiên tư vấn được chuyển tiếp từ Core

### Flow 1: Receiving Conversation Forwarding Requests from Core

1. Partner Consultation Service (S13) receives
    conversation forwarding requests from
    Core Consultation Service (S01) via A10a
    method `consultation_request`.

2. S13 replies to that method, then
    notifies the human agents
    (consultants) in the partner system
    about the new consultation request,
    via H31 event `consultation_request`.

3. When a human agent accepts or rejects the request
    (via H31 event `consultation_response`),
    S13 notifies S01 via A10b method
    `consultation_response`.

4. If the request is rejected, the flow ends here.
    If it is accepted, S13 saves the details
    of the conversation into its database,
    including the ID (i.e. set the `_id` field
    to exactly the `conversation_id` received
    from S01), title, customer ID,
    status (set to `HUMAN_AGENT_TEXTING`),
    etc.

5. The flow then continues to Flow 2 below.

### Flow 2: Human Agent Handling (Text)

This flow corresponds to use case TP-17.

1. S01 notifies S13 via A10a event `new_message`
    whenever the customer sends a text message
    in the forwarded conversation.

2. S13 stores the message into its database,
    then notifies the human agent
    (consultant) about the new message
    (via H31 event `new_message`).

3. The human agent may compose a text message
    and sends it to S13 (via H31 endpoint
    `POST /api/v1/conversations/{conversation_id}/messages`).

4. S13 stores the message into its database,
    then notifies S01 via A10b event `new_message`.

5. The flow continues so that the customer and
    the human agent could text each other.

### Flow 3: Human Agent Handling (Voice Call)

This flow corresponds to use case TP-18.

1. S01 notifies S13 via A10a event `call_start`
    whenever the customer starts a voice call
    in the forwarded conversation.

2. S13 notifies the human agent
    (consultant) about the incoming call
    (via H31 event `incoming_call`).

3. When the human agent picks up the call (via H31 event `call_pickup`),
    S13 notifies S01 via A10b event `call_pickup`.

4. S01 would then stream the customer's voice
    to S13, via A10a events
    `audio_start`, `audio_chunk`, and `audio_stop`.

    S13 would forward the audio chunks
    to the human agent in real-time, via H31.

    Meanwhile, the Partner Portal frontend would also stream
    the human agent's voice to S13, via H31 events
    `audio_start`, `audio_chunk`, and `audio_stop`.
    S13 in turn streams that to S01 via A10b events
    `audio_start`, `audio_chunk`, and `audio_stop`.

    Note that the audio streaming is verbatim - no
    processing (e.g. speech-to-text, speech detection)
    is done on S13 or the Partner Portal frontend.

    `audio_start` is sent when the human agent
    unmutes his microphone, and `audio_stop` is sent
    when he mutes it again. (FYI, the same applies
    for the customer side.)

5. When the human agent ends the call (via H31 event `call_end`),
    S13 notifies S01 via A10b event `call_end`,
    and the flow ends here.

6. Upon receiving the A10a event `call_end`
    from S01 (when the customer ends the call),
    S13 also notifies the human agent
    (consultant) that the call has ended
    (via H31 event `call_end`), and the flow ends here.

### Flow 4: Viewing Conversation History

This flow corresponds to use case TP-21.
These are trivial CRUD operations on the conversations
and messages collections. For more details,
see H31 API documentation.

## Database Schema

### Table: `conversations`

- `id` (ObjectId, Primary Key): ID của cuộc hội thoại
- `title` (string): Tiêu đề của cuộc hội thoại
- `customer_id` (string): ID của khách hàng đang chat
- `status` (string): nhận 1 trong các giá trị: `AI_AGENT_TEXTING`, `AI_AGENT_CALLING`, `FORWARDING`, `HUMAN_AGENT_TEXTING`, `HUMAN_AGENT_CALLING`
- `partner_id` (string, optional): ID của partner đã forward (nếu có)
- `customer_satisfaction` (int): mức độ hài lòng của khách hàng mà AI Agent đánh giá, dựa trên cảm xúc của người dùng và cả rating mà người dùng chủ động đánh giá (từ bảng reviews). Thang điểm 1 - 5
- `summary` (string): tóm tắt lịch sử trò chuyện
- `created_at` (datetime): thời điểm bắt đầu cuộc hội thoại
- `updated_at` (datetime): thời điểm cập nhật cuộc hội thoại lần cuối.

### Table: `messages`

- `id` (ObjectId, Primary Key): ID của tin nhắn
- `conversation_id` (string): ID của cuộc hội thoại tương ứng
- `sender_type` (string): Loại người gửi tin nhắn. Nhận một trong các giá trị: `CUSTOMER`, `AI_AGENT`, `HUMAN_AGENT`.
- `sender_id` (string, optional): ID của người gửi (chỉ có giá trị trong trường hợp người gửi là `HUMAN_AGENT`).
- `sender_name` (string, optional): Tên của người gửi (chỉ có giá trị trong trường hợp người gửi là `HUMAN_AGENT`).
- `content` (string): Nội dung tin nhắn.
- `emotion` (string): Cảm xúc của người dùng (do S19 xác định). Nhận một trong ba giá trị: `Positive`, `Neutral`, `Negative`.
- `created_at` (datetime): Thời gian gửi tin nhắn.

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

  The class is [located in this file](../../../app/services/MessageQueueService.py).

  An example of using this class [is given here](../../MessageQueueService-usage-example.py).

  Also, for multithreading, only use the scheme in that file.
  Any other use of multithreading, if necessary, must strictly
  look for hazards - use locks and other synchronization primitives
  where appropriate.

- If this service needs to expose HTTP API(s), use Flask.

- The program entry point is [in this file](../../../app/__main__.py).
