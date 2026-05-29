from app.security.passwords import hash_password, verify_password


def test_hash_is_not_plaintext():
    h = hash_password("hunter22!")
    assert h != "hunter22!"
    assert h.startswith("$argon2")


def test_verify_accepts_correct_password():
    h = hash_password("hunter22!")
    assert verify_password("hunter22!", h) is True


def test_verify_rejects_wrong_password():
    h = hash_password("hunter22!")
    assert verify_password("nope", h) is False


def test_each_hash_uses_unique_salt():
    assert hash_password("same") != hash_password("same")