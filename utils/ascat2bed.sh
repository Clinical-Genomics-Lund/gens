#!/bin/bash
# usage: 
# ascat2bed.sh file.in baf|cov 

# re-using this awk part
function get_new_average {
  awk '{
    chr = $1;
    start = $2;
    val = $4;
    # get the next line
    getline;
    # only if chromosomes are matching
    if(chr == $1) {
      start = (start+$2)/2;
      val = (val + $4)/2
      printf("%s\t%d\t%d\t%f\n",$1,start,start+1,val)
    }
  }' $1 | sed 's/'$3'/'$4'/g' > $2
}


# first of all, get rid of random/alt/HLA whatever contigs

RAW=raw.baf
echo "sorting raw data ..."
egrep -v "random|HLA|alt|chrUn|Position" $1 |sort -V -k2,2 -k3,3n > $RAW

# first make the "d" series, that is the easiest
#
# from
#
# snp1    chr1    14930   0
# snp2    chr1    15211   0.1429
# snp4    chr1    18849   NA
# snp5    chr1    30923   1
#
# to
#
# d_1   14930   14931   0 
# d_1   15211   15212   0.1429
# d_1   30923   30924   1

echo "generating d_ series ..."
awk '!/NA/{
  sub(/chr/,"",$2);
  print "d_"$2"\t"$3"\t"$3+1"\t"$4
}' $RAW > d_${RAW}

# half the points by printing out averages only
echo "generating c_ series ..." 
get_new_average d_${RAW} c_${RAW} d_ c_

# ditto for the rest
echo "generating b_ series ..." 
get_new_average c_${RAW} b_${RAW} c_ b_

echo "generating a_ series ..." 
get_new_average b_${RAW} a_${RAW} b_ a_

echo "generating o_ series ..." 
get_new_average a_${RAW} o_${RAW} a_ o_

echo "concatenating "
OUT=${1%.*}.${2}.bed
cat o_raw.baf a_raw.baf b_raw.baf c_raw.baf d_raw.baf > ${OUT}
bgzip ${OUT}
tabix ${OUT}.gz
