
# best to massage the file with
# egrep -v "random|HLA|alt|chrUn|Position" ASCAT.BAF |sort -V -k2,2 -k3,3n
# as it is not sorted whatsoever

BEGIN{
  chr=""  # we start from no chromosome
  start=1 # 1-based coordinates
}
/^snp/{
  # there is a header line, data starts at line 2
  # start a new chromosome
  if(chr!=$2) {
    chr=$2;
    start=$3;
  } else {
    # $3 is end
    # print only if BAF ($4) is available
    if($4!~/NA/)
      print chr"\t"start"\t"$3"\t"$4
    # still have to update choords
    start=$3
  }
}
