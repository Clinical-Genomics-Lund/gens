"""Test IO related functions."""

import pytest
from app.io.coverage import _get_filepath


def test_get_filepath():
    """Test function for generating file system filepaths."""
    # test throwing errors if file not found
    PATH = "not/a/file/path"
    with pytest.raises(FileNotFoundError):
        _get_filepath(*PATH.split("/"), check=True)

    assert PATH == _get_filepath(*PATH.split("/"), check=False)
