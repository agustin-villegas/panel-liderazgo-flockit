import httpx

from app.jira.cloud import JiraCloud

SITE = "https://ejemplo.atlassian.net"


def client(handler: httpx.MockTransport) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=handler)


async def test_boards_incluye_scrum_kanban_y_simple():
    urls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        urls.append(str(request.url))
        return httpx.Response(
            200,
            json={
                "startAt": 0,
                "maxResults": 50,
                "total": 3,
                "isLast": True,
                "values": [
                    {"id": 1, "name": "Scrum", "type": "scrum", "location": {"projectKey": "SC"}},
                    {"id": 2, "name": "Kanban", "type": "kanban", "location": {"projectKey": "KN"}},
                    {"id": 3, "name": "Simple", "type": "simple", "location": {"projectKey": "SM"}},
                ],
            },
        )

    async with client(httpx.MockTransport(handler)) as http:
        boards = await JiraCloud(SITE, "a@b.c", "token", http).boards()

    assert [b.id for b in boards] == [1, 2, 3]
    assert "type=" not in urls[0]


async def test_board_sin_sprints_devuelve_lista_vacia():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"errorMessages": ["The board does not support sprints"]})

    async with client(httpx.MockTransport(handler)) as http:
        sprints = await JiraCloud(SITE, "a@b.c", "token", http).sprints(34)

    assert sprints == []
