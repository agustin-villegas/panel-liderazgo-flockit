from datetime import date

import pytest

from app.board.models import Lane, lane_of, workdays


@pytest.mark.parametrize(
    ("cat", "status", "flag", "lane"),
    [
        ("new", "Por hacer", False, Lane.TODO),
        ("indeterminate", "En curso", False, Lane.DOING),
        ("done", "Finalizada", False, Lane.DONE),
        ("indeterminate", "Bloqueado", False, Lane.BLOCKED),
        ("new", "En espera del cliente", False, Lane.BLOCKED),
        ("indeterminate", "En curso", True, Lane.BLOCKED),
        ("done", "Blocked", True, Lane.DONE),  # terminada gana
    ],
)
def test_carriles(cat, status, flag, lane):
    assert lane_of(cat, status, flag) == lane


def test_dias_habiles_excluyen_fin_de_semana():
    # lun 5 → vie 16 de octubre de 2026: 10 hábiles
    assert workdays(date(2026, 10, 5), date(2026, 10, 16)) == 10
    assert workdays(date(2026, 10, 10), date(2026, 10, 11)) == 0  # sáb y dom
    assert workdays(date(2026, 10, 9), date(2026, 10, 8)) == 0
