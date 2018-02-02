/*
   A C-program for MT19937, with initialization improved 2002/1/26.
   Coded by Takuji Nishimura and Makoto Matsumoto.

   Before using, initialize the state by using init_genrand(seed)
   or init_by_array(init_key, key_length).

   Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
   All rights reserved.

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:

     1. Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.

     2. Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.

     3. The names of its contributors may not be used to endorse or promote
        products derived from this software without specific prior written
        permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
   A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER
   OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
   PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


   Any feedback is very welcome.
   http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
   email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
*/

var mt19937 = (function() {

    function product(lhs, rhs) {
        var ulhs = ui32(lhs);
        var urhs = ui32(rhs);
        var ret = ui32(0);
        for (var shift = 0; shift < 32; shift += 4) {
            var nibble = ui32(ulhs * ((urhs >>> shift) & 0xF));
            ret = ui32(ret + ui32(nibble << shift));
        }
        return ret;
    }

    function ui32(arg) {
        return arg >>> 0;
    }

    /* Period parameters */

    // #define N 624
    var N = 624;

    // #define M 397
    var M = 397;

    // #define MATRIX_A 0x9908b0dfUL   /* constant vector a */
    var MATRIX_A = 0x9908b0df;

    // #define UPPER_MASK 0x80000000UL /* most significant w-r bits */
    var UPPER_MASK = 0x80000000;

    // #define LOWER_MASK 0x7fffffffUL /* least significant r bits */
    var LOWER_MASK = 0x7fffffff;

    // static unsigned long mt[N]; /* the array for the state vector  */
    var mt = [];
    for (var i = 0; i < N; i++) {
        mt.push(0);
    }

    // static int mti=N+1; /* mti==N+1 means mt[N] is not initialized */
    var mti = N + 1;

    /* initializes mt[N] with a seed */

    // void init_genrand(unsigned long s)
    function init_genrand(s) {

        // mt[0]= s & 0xffffffffUL;
        mt[0] = ui32(s & 0xffffffff);

        // for (mti=1; mti<N; mti++)
        for (mti = 1; mti < N; mti++) {

            // mt[mti] =
            //     (1812433253UL * (mt[mti-1] ^ (mt[mti-1] >> 30)) + mti);
            mt[mti] = ui32(mt[mti - 1] ^ ui32(mt[mti - 1] >>> 30));
            mt[mti] = ui32(product(mt[mti], 1812433253));
            mt[mti] = ui32(mt[mti] + mti);

            /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
            /* In the previous versions, MSBs of the seed affect   */
            /* only MSBs of the array mt[].                        */
            /* 2002/01/09 modified by Makoto Matsumoto             */

            // mt[mti] &= 0xffffffffUL;
            mt[mti] = ui32(mt[mti] & 0xffffffff);

            /* for >32 bit machines */
        }
    }

    /* initialize by an array with array-length */
    /* init_key is the array for initializing keys */
    /* key_length is its length */
    /* slight change for C++, 2004/2/26 */

    // void init_by_array(unsigned long init_key[], int key_length)
    function init_by_array(init_key, key_length) {

        var temp = null;

        // int i, j, k;
        var i = 0;
        var j = 0;
        var k = 0;

        // init_genrand(19650218UL);
        init_genrand(19650218);

        // i=1; j=0;
        i = 1;
        j = 0;

        // k = (N > key_length ? N : key_length);
        k = (N > key_length ? N : key_length);

        // for (; k; k--)
        for (k = k; k; k--) {

            // mt[i] = (mt[i] ^ ((mt[i-1] ^ (mt[i-1] >> 30)) * 1664525UL))
            //   + init_key[j] + j; /* non linear */
            temp = ui32(mt[i - 1] ^ ui32(mt[i - 1] >>> 30));
            mt[i] = ui32(mt[i] ^ ui32(product(temp, 1664525)));
            mt[i] = ui32(mt[i] + init_key[j] + j); /* non linear */

            // mt[i] &= 0xffffffffUL; /* for WORDSIZE > 32 machines */
            mt[i] = ui32(mt[i] & 0xffffffff); /* for WORDSIZE > 32 machines */

            // i++; j++;
            i += 1;
            j += 1;

            // if (i>=N)
            if (i > N || i === N) {

                // mt[0] = mt[N-1];
                mt[0] = mt[N - 1];

                // i=1;
                i = 1;

            }

            // if (j>=key_length)
            if (j > key_length || j === key_length) {

                // j=0;
                j = 0;

            }

        }

        // for (k=N-1; k; k--)
        for (k = N - 1; k; k--) {

            // mt[i] = (mt[i] ^ ((mt[i-1] ^ (mt[i-1] >> 30)) * 1566083941UL))
            //   - i; /* non linear */
            temp = ui32(mt[i-1] ^ ui32(mt[i-1] >>> 30));
            mt[i] = ui32(mt[i] ^ ui32(product(temp, 1566083941)));
            mt[i] = ui32(mt[i] - i); /* non linear */

            // mt[i] &= 0xffffffffUL; /* for WORDSIZE > 32 machines */
            mt[i] = ui32(mt[i] & 0xffffffff);

            // i++;
            i += 1;

            // if (i>=N)
            if (i > N || i === N) {

                // mt[0] = mt[N-1];
                mt[0] = mt[N - 1];

                // i=1;
                i = 1;

            }

        }

        // mt[0] = 0x80000000UL; /* MSB is 1; assuring non-zero initial array */
        mt[0] = 0x80000000;

    }

    /* generates a random number on [0,0xffffffff]-interval */

    // unsigned long genrand_int32(void)
    function genrand_int32() {

        // unsigned long y;
        var y = 0;

        // static unsigned long mag01[2]={0x0UL, MATRIX_A};
        var mag01 = [0x0, MATRIX_A];

        /* mag01[x] = x * MATRIX_A  for x=0,1 */

        // if (mti >= N) /* generate N words at one time */
        if (mti > N || mti === N) {

            // int kk;
            var kk = 0;

            // if (mti == N+1)   /* if init_genrand() has not been called, */
            if (mti === N + 1) {

                // init_genrand(5489UL); /* a default initial seed is used */
                init_genrand(5489);

            }

            // for (kk=0;kk<N-M;kk++)
            for (kk = 0; kk < N - M; kk++) {

                // y = (mt[kk]&UPPER_MASK)|(mt[kk+1]&LOWER_MASK);
                y = 0;
                y = ui32(y | ui32(mt[kk + 0] & UPPER_MASK));
                y = ui32(y | ui32(mt[kk + 1] & LOWER_MASK));

                // mt[kk] = mt[kk+M] ^ (y >> 1) ^ mag01[y & 0x1UL];
                mt[kk] = ui32(mt[kk + M] ^ ui32(y >>> 1));
                mt[kk] = ui32(mt[kk] ^ mag01[ui32(y & 0x1)]);
            }

            // for (;kk<N-1;kk++)
            for (kk = kk; kk < N - 1; kk++) {

                // y = (mt[kk]&UPPER_MASK)|(mt[kk+1]&LOWER_MASK);
                y = 0;
                y = ui32(y | ui32(mt[kk + 0] & UPPER_MASK));
                y = ui32(y | ui32(mt[kk + 1] & LOWER_MASK));

                // mt[kk] = mt[kk+(M-N)] ^ (y >> 1) ^ mag01[y & 0x1UL];
                mt[kk] = ui32(mt[kk + (M - N)] ^ ui32(y >>> 1));
                mt[kk] = ui32(mt[kk] ^ mag01[ui32(y & 0x1)]);

            }

            // y = (mt[N-1]&UPPER_MASK)|(mt[0]&LOWER_MASK);
            y = 0;
            y = ui32(y | ui32(mt[N-1] & UPPER_MASK));
            y = ui32(y | ui32(mt[0] & LOWER_MASK));

            // mt[N-1] = mt[M-1] ^ (y >> 1) ^ mag01[y & 0x1UL];
            mt[N - 1] = ui32(mt[M - 1] ^ ui32(y >>> 1));
            mt[N - 1] = ui32(mt[N - 1] ^ mag01[ui32(y & 0x1)]);

            // mti = 0;
            mti = 0;

        }

        // y = mt[mti++];
        y = mt[mti];
        mti += 1;

        /* Tempering */

        // y ^= (y >> 11);
        y = ui32(y ^ ui32(y >>> 11));

        // y ^= (y << 7) & 0x9d2c5680UL;
        y = ui32(y ^ ui32(ui32(y << 7) & 0x9d2c5680));

        // y ^= (y << 15) & 0xefc60000UL;
        y = ui32(y ^ ui32(ui32(y << 15) & 0xefc60000));

        // y ^= (y >> 18);
        y = ui32(y ^ ui32(y >>> 18));

        // return y;
        return y;
    }

    /* generates a random number on [0,0x7fffffff]-interval */

    // long genrand_int31(void)
    function genrand_int31() {

        // return (long)(genrand_int32()>>1);
        return ui32(genrand_int32() >>> 1);

    }

    /* generates a random number on [0,1]-real-interval */

    // double genrand_real1(void)
    function genrand_real1() {

        // return genrand_int32()*(1.0/4294967295.0);
        return genrand_int32() * (1.0 / 4294967295.0);

        /* divided by 2^32-1 */

    }

    /* generates a random number on [0,1)-real-interval */

    // double genrand_real2(void)
    function genrand_real2() {

        // return genrand_int32()*(1.0/4294967296.0);
        return genrand_int32() * (1.0 / 4294967296.0);

        /* divided by 2^32 */

    }

    /* generates a random number on (0,1)-real-interval */

    // double genrand_real3()
    function genrand_real3() {

        // return (((double)genrand_int32()) + 0.5)*(1.0/4294967296.0);
        return ((1.0 * genrand_int32()) + 0.5) * (1.0 / 4294967296.0);

        /* divided by 2^32 */

    }

    /* generates a random number on [0,1) with 53-bit resolution*/

    // double genrand_res53()
    function genrand_res53() {

        // unsigned long a=genrand_int32()>>5, b=genrand_int32()>>6; 
        var a = ui32(genrand_int32() >>> 5);
        var b = ui32(genrand_int32() >>> 6);

        // return(a*67108864.0+b)*(1.0/9007199254740992.0); 
        return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);

    }

    /* These real versions are due to Isaku Wada, 2002/01/09 added */

    // int main(void)
    function main() {

        var msg = "";

        // int i;
        var i = 0;

        // unsigned long init[4]={0x123, 0x234, 0x345, 0x456}, length=4;
        var init = [0x123, 0x234, 0x345, 0x456];
        var length = 4;

        // init_by_array(init, length);
        init_by_array(init, length);

        // printf("1000 outputs of genrand_int32()\n");
        console.log("1000 outputs of genrand_int32()\n");

        // for (i=0; i<1000; i++)
        for (i = 0; i < 1000; i++) {

            // printf("%10lu ", genrand_int32());
            msg += ("" + genrand_int32() + " ");

            // if (i%5==4)
            if (i % 5 === 4) {

                // printf("\n");
                msg += ("\n");

            }

        }

        // printf("\n1000 outputs of genrand_real2()\n");
        msg += "\n1000 outputs of genrand_real2()\n";

        //for (i=0; i<1000; i++)
        for (i=0; i<1000; i++) {

            // printf("%10.8f ", genrand_real2());
            msg += ("" + genrand_real2());

            // if (i%5==4)
            if (i % 5 === 4) {

                // printf("\n");
                msg += ("\n");

            }

        }

        // return 0;
        console.log(msg);
        return 0;

    }

    return {
        init_genrand: init_genrand,
        init_by_array: init_by_array,
        genrand_int32: genrand_int32,
        genrand_int31: genrand_int31,
        genrand_real1: genrand_real1,
        genrand_real2: genrand_real2,
        genrand_real3: genrand_real3,
        genrand_res53: genrand_res53,
        main: main,
    };

})();
