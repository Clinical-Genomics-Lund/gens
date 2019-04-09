#!/usr/bin/python2.7
import tabix

cov_file = "/data/trannel/proj/wgs/sentieon/bam/test2.cov.gz"

tb = tabix.open(cov_file)

records = tb.query("1", 1000000, 1250000)

# Each record is a list of strings.
for record in records:
        print(record[:4])
