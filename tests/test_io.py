"""Test IO related functions."""

import os
from unittest.mock import Mock

import pytest

from gens.io import _get_filepath, get_overview_json_path


def test_get_filepath():
    """Test function for generating file system filepaths."""
    # test throwing errors if file not found
    PATH = 'not/a/file/path'
    with pytest.raises(FileNotFoundError):
        _get_filepath(*PATH.split('/'), check=True)

    assert PATH == _get_filepath(*PATH.split('/'), check=False)


def test_get_overview_json_path(monkeypatch):
    """Test the function that retrieves json files."""
    # test a path is generated if file is found
    with monkeypatch.context() as m:
        sample_name = 'sample'
        hg_path = 'some/path'
        expected = f'{hg_path}/{sample_name}.overview.json.gz'
        mock_get_file = Mock(return_value=expected)
        m.setattr("gens.io._get_filepath", mock_get_file)

        assert expected == get_overview_json_path(sample_name, hg_path)
        mock_get_file.assert_called_with(hg_path,
                                         f'{sample_name}.overview.json.gz')

    # test when file is not found
    with monkeypatch.context() as m:
        def mock_raise_exception(*args, **kwargs):
            raise FileNotFoundError
        m.setattr("gens.io._get_filepath", mock_raise_exception)
        assert get_overview_json_path(sample_name, hg_path) is None
