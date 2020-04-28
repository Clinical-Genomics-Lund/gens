# GENS


## About

**Gens** is a web-based interactive tool to visualize genomic copy number profiles from WGS data (although it could theoretically be used for any type of data). It plots the normalized read depth and alternative allele frequency. It currently does not attempt to visualize breakpoint information, so use IGV for that! The way we generate the data it is suitable for visualizing CNVs of sizes down to a couple Kbp, for smaller things us IGV! 

This screenshot shows an 8 Kbp deletion (known polymorphism). Sorry about the boring screenshot, but we cannot show identifiable data.
<img src="images/gens_screenshot.png">

## Installation

Gens requires python 3.5 or later and mongodb. For testing/development purposes the easiest way to install it is to create a virtual environment:

```
$ git clone https://github.com/Clinical-Genomics-Lund/Gens.git
$ cd Gens
$ virtualenv -p python3 venv
$ source venv/bin/activate
$ pip install -r requirements.txt
```

Start the application using:
```
$ export FLASK_APP=gens.py && flask run
```

Make sure the application is running by loading http://127.0.0.1:5000/ in your web browser.

Finally you need to populate the databases with chromosome sizes and gene/transcript data using the scripts **utils/update_chromsizes.py** and **utils/update_transcripts.py**. (TODO: Add more details here!)

## Data generation

Gens uses a custom tabix-indexed bed file format to hold the plot data. This file can be generated in any way, as long as the format of the file is according to the specification (see the section "Data format"). This section describes the method we're using to create the data.

We are using the GATK4 workflow for normalizing the read depth data. It is described in detail here: https://gatk.broadinstitute.org/hc/en-us/articles/360035531092?id=11682. But here is a short summary of what we're doing:

### Create PON

Create targets file:
```
gatk PreprocessIntervals \
     --reference GRCh38.fa \
     --bin-length 100 \
     --interval-merging-rule OVERLAPPING_ONLY \
     -O targets_preprocessed_100bp.interval_list
```

Build a panel of normals (PON). First run this command for all bam files that you want to include in the PON. We have one PON for males and one for females. We have approx. 100 individuals of each sex in the PONs, but less should be fine.
```
gatk CollectReadCounts \
    -I sample1.bam \
    -L targets_preprocessed_100bp_bins.interval_list \
    --interval-merging-rule OVERLAPPING_ONLY \
    -O hdf5/sample1.hdf5
```

Then build the PON. This is fairly memory intensive, so make sure you have enough memory and adjust the -Xmx if necessary.
```
gatk --java-options "-Xmx120000m" CreateReadCountPanelOfNormals \
     --minimum-interval-median-percentile 10.0 \
     --maximum-chunk-size 29349635 \
     -O male_pon_100bp.hdf5 \
     -I hdf5/sample1.hdf5 \
     -I hdf5/sample2.hdf5 \
     ...
     -I hdf5/sample99.hdf5
```

### Calculate normalized read depth data

Then in your pipeline. Use these commands to count and normalize the data of a sample:

```
gatk CollectReadCounts \
    -I subject.bam -L targets_preprocessed_100bp_bins.interval_list \
    --interval-merging-rule OVERLAPPING_ONLY -O subject.hdf5
                                                                                                                                            
gatk --java-options "-Xmx30g" DenoiseReadCounts \\                                                                                  
    -I subject.hdf5 --count-panel-of-normals male_pon_100bp.hdf5 \\                                                                      
    --standardized-copy-ratios subject.standardizedCR.tsv \\                                                                      
    --denoised-copy-ratios subject.denoisedCR.tsv                                                                                 
```

### Generate BAF data

It is possible to use the GATK tools to create BAF data as well, but we've found it to be very slow and since we are already doing (germline) variant calling, we extract the BAF data from the gVCF using the script provided in the **utils** directory.

### Reformatting the data for Gens

Once you have the standardized coverage file from GATK and a gVCF you can create Gens formatted data files using the command below. The script should accept any properly formatted gVCF but only output from GATK HaplotypeCaller and Sentieon DNAscope have been tested.

```
utils/generate_gens_data.pl subject.standardizedCR.tsv subject.gvcf SAMPLE_ID gnomad_hg38.0.05.txt.gz
```

The script requires that **bgzip** and **tabix** are installed in a $PATH directory. 

The final output should be two files named: **SAMPLE_ID.baf.bed.gz** and **SAMPLE_ID.cov.bed.gz**

## Loading data into Gens

The generated data files should be put in one of the folders defined in config.py, depending on which genome build you've used. To load the data in a web browser simplt enter the URL **hostname.com:5000/SAMPLE_ID**. By default it will look for files in the hg38 folder. In order to use data from the hg19/GRCh37 folder, use **hostname.com:5000/SAMPLE_ID?hg_type=37** 


## Data format

If you want to generate the data in some other way than described above you need to make sure the data conforms to these standards.

Two data files for each sample are needed by Gens. One file for normalized read depth data, and one for B-allele frequencies (BAF). Both are normal bed files, with the exception that they have 5 different precalculatad levels of resolution. The different resolutions are represented in the bed-file by prefixing the chromosome names with **o**, **a**, **b**, **c**, **d** followed by an underscore. Over represents the data for the static overview, where **a** represent the lowest interactive resolution and **d** the highest.

Each region in the bed file represents a single point in the plot (so it should be only 1 bp wide). The distance between the data points is what differs between the different resolutions. To create the data for lower resolutions we use a midpoint mean for read depth data, and simply take every Xth value for BAF.

```
o_1    1383799    1383800    -0.081
o_1    1483799    1483800    -0.120
...
a_1    1379199    1379200    -0.048
a_1    1404199    1404200    -0.088
...
b_1    1388999    1389000    0.018
b_1    1393999    1394000    -0.108
...
c_1    1386399    1386400    -0.136
c_1    1387399    1387400    -0.050
...
d_1    1386849    1386850    -0.340
d_1    1386949    1386950    -0.312
```

The fourth column values should be log2-ratio values (log2(depth/average depth)) for the read depth data and allele frequencies between 0.0 and 1.0 for BAF data.

The bin size for each resolution could be anything, but the if they are too small there will be too many points to load in a view (making things slow), if they are too big the points will be too sparse. Here are the bin sizes we're using:

| resolution level | bin size | # data points | # SNPs (BAF)     |
|------------------|----------|---------------|------------------|
| o                | 100,000  | 28,000        | 47,000           |
| a                | 25,000   | 110,000       | 188,000          |
| b                | 5,000    | 550,000       | 754,000          |
| c                | 1,000    | 2,700,000     | 1,900,000        |
| d                | 100      | 26,400,000    | 7,500,000        |


The **o** resolution is used only for the whole genome overview plot. The number of data points in this resolution really affects the time it takes to initially load a sample into Gens.

### Selection of SNPs for BAF data

We're using all SNPs in gnomAD with an total allele frequency > 5%, which in gnomAD 2.1 is approximately 7.5 million SNPs.

## Limitations

- Only works in web browsers supporting OffscreenCanvas ([MDN browser compatibility](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas#Browser_compatibility)). This means that it essentially only works in Chrome (and theoretically Edge and Opera, but that has not been tested). Unfortunately, enabling the experimental OffscreenCanvas support in Firefox does not appear to work (as of version 75). The OffscreenCanvas could probably be made optional, to support all modern web browsers.

- Currently no efforts have been made to make it work for non-human organisms. Chromosome names are currently hardcoded to 1-23,X,Y.
