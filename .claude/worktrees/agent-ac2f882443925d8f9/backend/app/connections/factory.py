from app.connections.models import DEMO, Connection
from app.core.crypto import Cipher
from app.jira.cloud import JiraCloud
from app.jira.demo import JiraDemo
from app.jira.source import JiraSource


class SourceFactory:
    """Crea la fuente de datos de una conexión. La Demo se comparte (es determinística)."""

    def __init__(self, cipher: Cipher) -> None:
        self.cipher = cipher
        self.demo = JiraDemo()

    def make(self, conn: Connection) -> JiraSource:
        if conn.kind == DEMO:
            return self.demo
        if not (conn.site and conn.email and conn.token_enc):
            raise ValueError(f"La conexión {conn.name} está incompleta")
        return JiraCloud(conn.site, conn.email, self.cipher.open(conn.token_enc))

    def raw(self, site: str, email: str, token: str) -> JiraSource:
        return JiraCloud(site, email, token)
