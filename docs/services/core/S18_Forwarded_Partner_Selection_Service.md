# Telcenter Core - Forwarded Partner Selection Service

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

Now, you are designing the Forwarded Partner Selection Service, in Python.
This service is inside the Core system.

Here are the peer services that this service may interact with. We will come up
with the flow of this service itself later.

- **S01 - Consultation Service:** The service that is responsible for
    mediating the users' inquiries and responses. It also holds
    the conversations database.

- **S07 - Core's Partner Management Service:** The service that is responsible
    for managing the partners' information, including
    their IDs, names, and other metadata.

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

[A35](../../api_groups/A35.md)

[A37](../../api_groups/A37.md)

## Logic Flow

1. S01 notifies S18
    via A35a event `need_forwarding`
    whenever a conversation needs to be
    forwarded to a human agent at a partner
    system.

2. S18 queries S07 to obtain
    the list of available partners,
    including their **IDs and names**.
    This would be used for partner selection
    later.

3. S18 calls Gemini LLM API
    to select the best partner
    for that conversation, based on
    the conversation summary.

    The prompt is like this:

    ```
    Bạn là một tư vấn viên trung gian,
    giúp kết nối khách hàng với các đối tác viễn thông.
    Dựa trên tóm tắt cuộc hội thoại sau đây,
    hãy chọn đối tác phù hợp nhất để chuyển tiếp cuộc hội thoại.

    Định dạng phản hồi của bạn: chỉ là tên đối tác, không có gì khác.
    Nếu không thể chọn đối tác phù hợp dựa vào ngữ cảnh
    đã cho, trả lời "IMPOSSIBLE".

    Danh sách các đối tác bao gồm:
    ---
    {partner_name_list}
    ---

    Tóm tắt cuộc hội thoại:
    ---
    {conversation_summary}
    ---

    Câu trả lời của bạn:
    ```

4. If the LLM's response is not `IMPOSSIBLE`,
    S18 looks up the selected partner's ID
    based on the name returned by Gemini.
    Then, S18 notifies S01
    via A35b event `forwarded_partner_selection_finished`
    about the selected partner ID and name.

    Otherwise, S18 also notifies S01
    via that event, but with status `error`
    and message `Could not select a suitable partner.`.

If it fails at any stage, the whole process fails.
That is, immediately emit the A35b event
`forwarded_partner_selection_finished`
with status `error` and the
appropriate error message
indicating what went wrong.

## This Service's APIs

[A35](../../api_groups/A35.md)

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
