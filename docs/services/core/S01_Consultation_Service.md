# Telcenter Core - Consultation Service (S01)

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

Now, you are designing the Consultation Service service, in Python.
This service is inside the Telcenter Core system.

Here are the peer services that this service may interact with. We will come up
with the flow of this service itself later.

- S02: Consultant AI Agent
- S08: Core Metrics Service
- S19: Conversation Analysis Service
- S18: Forwarded Partner Selection Service
- S13: Partner Consultation Service (this is communicated through a Partner Gateway
  to ensure the messages come to the right partner, as selected by S18).
- S20: Speech Service (for Speech-to-Text and Text-to-Speech tasks).

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

### S02

[A02](../../api_groups/A02.md)

### S08

[A03a](../../api_groups/A03a.md)

[A03b](../../api_groups/A03b.md)

### S19

[A36](../../api_groups/A36.md)

### S18

[A35](../../api_groups/A35.md)

### S13

[A10](../../api_groups/A10.md)

### S20

[A38](../../api_groups/A38.md)

## The Flows

This service supports the following use cases:

- UC-03: Khách hàng nhận tư vấn (tra cứu, hỏi đáp) qua tin nhắn văn bản (text) hoặc cuộc gọi thoại (voice call)
  - Flow 1: AI Agent Handling
  - Flow 2: Human Agent Handling (Forwarding to Partner)
- UC-04: Xem lịch sử tư vấn (các phiên tư vấn/hỏi đáp)
- UC-05: Khách hàng đánh giá chất lượng dịch vụ

### Flow 1: AI Agent Handling (Text)

This corresponds to UC-03 where the AI Agent
handles the consultation session fully without
forwarding to a human agent (yet).

This flow happens when the conversation
`status` is `AI_AGENT_TEXTING`.

1. Customer initiates a consultation session (inbox)
    from Core Portal (Frontend) via H19 `POST AUTH /api/v1/conversations`,
    or chooses an existing conversation that is
    in `AI_AGENT_TEXTING` status.

2. S01 creates a new/updates that conversation record
    in its database, setting the `status` to `AI_AGENT_TEXTING`.
    
    If this is new, set `customer_satisfaction` to `5` initially.

    Then, S01 returns the conversation
    information.

3. Customer sends a message from Core Portal (Frontend)
    to Core Consultation Service (this service) via H19,
    corresponding to that particular conversation.

4. Core Consultation Service (S01) sends the message
    to Core AI Agent Service (S02) via A02. At the
    same time, S01 sends the message to Core Conversation
    Analysis Service (S19) via A36 for more analysis.
    Finally, S01 also saves the message into its
    database.

5. Core AI Agent Service (S02) processes the message
    and returns the AI-generated response
    to Core Consultation Service via A02.

6. Core Consultation Service returns the AI-generated
    response coming in several chunks to Core Portal (Frontend) via H19
    (`text_start`, `text_chunk` and `text_stop` events).

7. Core Consultation Service (S01) also collects
    the AI-generated response chunks, concatenates
    them into a full text, and saves it as a new message
    into its database.

    In case S02 returns an error response with
    content "FORWARD", S01 creates an artificial
    message in the conversation to notify the customer that
    AI Agent could not answer the question, and that
    any new messages will be forwarded to a human agent
    at a partner system. Also, S01 updates the conversation
    `status` to `FORWARDING`.

### Subthread Flow 1: Customer Satisfaction Analysis

This is asynchronous and must be done in a separate thread,
without waiting for it to complete before returning
the AI-generated response to the customer, or doing
anything else.

1. Core Conversation Analysis Service (S19)
    returns the customer satisfaction estimation
    to Core Consultation Service (S01) via A36.

2. Core Consultation Service updates the
    corresponding message record in its database
    with the sentiment analysis result.

3. If the updated `customer_satisfaction` is `1`,
    S01 changes the conversation `status` to `FORWARDING`
    to indicate that the conversation must be forwarded
    to a human agent at a partner system.

### Subthread Flow 2: Conversation Summarization

This is asynchronous and must be done in a separate thread,
without waiting for it to complete before returning
the AI-generated response to the customer, or doing
anything else.

1. S19 returns the conversation summary to
    S01 via A36.

2. S01 updates the corresponding conversation
    record in its database with the new summary.

### Subthread Flow 3: Message Emotion Update

This is asynchronous and must be done in a separate thread,
without waiting for it to complete before returning
the AI-generated response to the customer, or doing
anything else.

1. S19 returns the message emotion update
    to S01 via A36.

2. S01 updates the corresponding message
    record in its database with the new emotion.

### Flow 2: AI Agent Handling (Voice Call)

This corresponds to UC-03 where the AI Agent
handles the consultation session fully without
forwarding to a human agent (yet).

This flow happens when the conversation
`status` is `AI_AGENT_TEXTING`.

1. Customer initiates a consultation session (inbox)
    from Core Portal (Frontend) via H19 `POST AUTH /api/v1/conversations`,
    or chooses an existing conversation that is
    in `AI_AGENT_TEXTING` status. He then
    clicks the "Call" button to start a voice call.

2. The frontend notifies Core Consultation Service (this service)
    via H19 event `call_start`
    that the customer is about to start a voice call on
    this conversation.

3. S01 creates a new/updates that conversation record
    in its database, setting the `status` to `AI_AGENT_CALLING`.

    If this is new, set `customer_satisfaction` to `5` initially.

    Then, S01 returns the conversation
    information.

4. The frontend uses the VAD library to detect
    when the customer is speaking. When the customer
    has finished speaking (i.e. VAD detects silence),
    the frontend sends the recorded audio
    to Core Consultation Service (this service)
    via H19 `POST AUTH /api/v1/conversations/{conversation_id}/audio`.

5. S11, upon receiving the audio file,
    sends it to the Speech Service (S20)
    via A38 for Speech-to-Text conversion.

6. Speech Service (S20) returns the transcribed text
    to Core Consultation Service (S01) via A38.

7. Core Consultation Service (S01) sends the transcribed text
    to Core AI Agent Service (S02) via A02.
    
    This time, S01 **does not send** the transcribed text
    to S19, and **neither does it save** the transcribed text
    as a message into its database.

8. Core AI Agent Service (S02) processes the text
    and returns the AI-generated response
    in several chunks to Core Consultation Service via A02.

9. Core Consultation Service collects the AI-generated
    response chunks, concatenates them into a full text,
    and sends it to Speech Service (S20) via A38
    for Text-to-Speech conversion.
    
    In case S02 returns an error response with
    content "FORWARD", S01 sends to S20 this
    text for TTS conversion instead:
    
    ```
    Xin lỗi Quý khách, tôi không thể trả lời câu hỏi này.
    ```

10. Speech Service (S20) returns the audio file to
    Core Consultation Service (S01)
    via A38.

11. Core Consultation Service returns the audio data
    to Core Portal (Frontend) via H19 event `audio_file`.

12. The frontend plays the audio data
    to the customer. **After the playing finished,**
    the frontend goes back to step 3 to continue
    getting user input.

13. When the customer clicks the "End Call" button,
    the frontend notifies Core Consultation Service (this service)
    via H19 event `call_end`.

14. S01 updates the conversation status back to `AI_AGENT_TEXTING`
    when:

    - it receives an explicit H19 `call_end` event from the client, or
    - the client disconnects from Socket.IO and does not reconnect within a configured timeout.

### Flow 3: Forwarding to Partner

This corresponds to UC-03 where the AI Agent
forwards the consultation session to a human agent
at a Partner system.

This flow only happens when the `status` of the conversation
has already been `FORWARDING`, and the user
sends a new text message (but NOT a voice call
or any audio input).

1. Regardless of the customer's message, S01,
    when seeing that the conversation `status`
    is `FORWARDING`, sends a new message
    back to customer via H19
    to notify him/her that the conversation
    is being forwarded to a human agent.
    The message reads:

    ```
    Chúng tôi xin lỗi vì đã đem đến trải nghiệm không tốt cho Quý khách.
    Quý khách hãy chờ trong giây lát để được chuyển tiếp tới tư vấn viên phù hợp.
    ```

    "Sending" the message here means that S01 not
    only returns the message to the frontend
    via H19, but also saves it as a new message
    into its database.

2. Core Consultation Service (S01) calls
    Core Forwarded Partner Selection Service (S18)
    via A35 to select a suitable partner
    for handling the conversation.

3. Core Forwarded Partner Selection Service (S18)
    returns the selected partner ID to Core Consultation
    Service (S01) via A35.

4. Core Consultation Service (S01) creates
    a forwarded consultation request
    and sends it to Partner Consultation Service (S13)
    via A10 (event `consultation_request`).

    Meanwhile, the frontend should show a notification
    to the customer that the conversation is being forwarded,
    and that he/she should wait for a human agent
    to take over.

5. Partner Consultation Service (S13) acknowledges
    the forwarded consultation request
    via A10 (event `consultation_response`).

    If the response status is `rejected`, S01
    updates the conversation `status`
    to `AI_AGENT_TEXTING` to indicate that
    the AI Agent will continue handling the conversation.
    Also, S01 creates a new artificial message in the
    conversation to notify the customer that
    the forwarding has failed, and that the AI Agent
    will continue handling the conversation.

    The happy path continues only if the response status is `accepted`.
    In that case, S01 updates the conversation `status`
    to `HUMAN_AGENT_TEXTING`.

6. The forwarding process completes. Core Consultation Service (S01)
    notifies Core Portal (Frontend) via H19 event `status_switch`
    that the conversation status has changed to `HUMAN_AGENT_TEXTING`.

### Flow 4: Human Agent Handling (Text)

This corresponds to UC-03 where the Human Agent
at the Partner system handles the consultation session.

This flow only happens when the conversation
`status` is `HUMAN_AGENT_TEXTING`, and the user
sends a new text message (but NOT a voice call
or any audio input).

1. Customer sends a message from Core Portal (Frontend)
    to Core Consultation Service (this service) via H19,
    corresponding to that particular conversation.

2. Core Consultation Service (S01) forwards
    the message to Partner Consultation Service (S13)
    via A10a (event `new_message`).
    
    Finally, S01 also saves the message into its
    database.

3. The human agent sitting at the Partner system
    sees the new message and replies to it.

4. Partner Consultation Service (S13)
    sends the human agent's reply to Core Consultation
    Service (S01) via A10b (event `new_message`).

5. Core Consultation Service (S01) saves
    the message into its database, and
    returns the human agent's reply
    to Core Portal (Frontend) via H19.

### Flow 5: Human Agent Handling (Voice Call)

This corresponds to UC-03 where the Human Agent
at the Partner system handles the consultation session.

This flow only happens when the conversation
`status` is `HUMAN_AGENT_TEXTING`.

1. Customer chooses an existing conversation that is
    in `HUMAN_AGENT_TEXTING` status. He then
    clicks the "Call" button to start a voice call.

2. The frontend notifies Core Consultation Service (this service)
    via H19 event `call_start`
    that the customer is about to start a voice call on
    this conversation. While waiting, the
    frontend shows a "Connecting to human agent..." message.

3. S01, upon receiving that `call_start` event,
    and notifies Partner Consultation Service (S13)
    that the customer is starting a voice call, via
    A10a event `call_start`.

4. The human agent at the Partner system
    clicks a button to pick up the call.
    In doing so, Partner Consultation Service (S13)
    notifies Core Consultation Service (S01)
    via A10b (event `call_pickup`).

5. S01, upon receiving that `call_pickup` event,
    notifies the frontend via H19 event `status_switch`
    that the conversation status has changed to `HUMAN_AGENT_CALLING`.

6. The frontend removes the "Connecting to human agent..." message,
    and shows the call buttons ("Mute/Unmute", "End Call")
    to the customer. It now streams the customer's audio input
    to Core Consultation Service (this service).

    - Whenever the customer unmutes his microphone,
        the frontend notifies S01 via H19 event `audio_start`.
        The frontend then starts sending audio chunks
        (20 ms each) to S01 via H19 event `audio_chunk`.
    
    - Whenever the customer mutes his microphone,
        the frontend notifies S01 via H19 event `audio_stop`.
        The frontend then stops sending audio chunks
        to S01.

7. S01, upon receiving those audio events,
    forwards them to Partner Consultation Service (S13)
    via A10a events `audio_start`, `audio_chunk`, and `audio_stop`.

8. When the customer clicks the "End Call" button,
    the frontend notifies Core Consultation Service (this service)
    via H19 event `call_end`.

9. S01, upon receiving that `call_end` event,
    notifies Partner Consultation Service (S13)
    via A10a event `call_end`. S01 then
    updates the conversation status back to `HUMAN_AGENT_TEXTING`.

10. Partner Consultation Service (S13), upon receiving
    the `call_end` event, sets the conversation status
    to `HUMAN_AGENT_TEXTING` on its side, too.

11. S01 notifies the frontend via H19 event `status_switch`
    that the conversation status has changed back to `HUMAN_AGENT_TEXTING`.

12. The frontend goes back to normal texting mode.

13. If the customer disconnects from Socket.IO
    and does not reconnect within a configured timeout,
    S01 also updates the conversation status back to `HUMAN_AGENT_TEXTING`,
    and notifies S13 via A10a event `call_end`.

## This Service's APIs

[H19](../../api_groups/H19.md)

[A03a](../../api_groups/A03a.md)
[A03b](../../api_groups/A03b.md)

[A35](../../api_groups/A35.md)
[A36](../../api_groups/A36.md)

[A10](../../api_groups/A10.md)

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

### Table: `reviews`

- `id` (ObjectId, Primary Key): ID đánh giá
- `conversation_id` (string, UNIQUE): ID cuộc hội thoại tương ứng. Một cuộc hội thoại chỉ đánh giá một lần
- `rating` (int): Điểm đánh giá (sao). Nhận giá trị từ 1 - 5.
- `comment` (string): Ý kiến đánh giá của khách hàng.

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
