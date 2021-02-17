# coding: utf-8

from os import path

from setuptools import find_packages, setup

setup(
    name="gens",
    version="1.1.1",
    description="Gens is a web-based interactive tool to visualize genomic copy number profiles from WGS data.",
    license="MIT",
    author="Ronja",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3.5",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
    ],
    keywords=["Flask", "Genomics", "WGS"],
    packages=find_packages(),
    zip_safe=False,
    install_requires=[
        "Click>=7.0",
        "Flask>=1.1.2",
        "flask-debugtoolbar>=0.11.0",
        "flask-caching>=1.9.0",
        "itsdangerous>=1.1.0",
        "Jinja2>=2.11.1",
        "MarkupSafe>=1.1.1",
        "Werkzeug>=1.0.0",
        "pymongo>=3.9.0",
        "gtfparse>=1.2.0",
        "pysam>=0.15.4",
        "pyyaml",
        "attrs",
        "cattrs",
        "connexion[swagger-ui]",
        "flask-compress",
    ],
    setup_requires=["pytest-runner"],
    tests_require=["pytest", "mongomock"],
)
