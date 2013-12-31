/**
	xxHash implementation in pure Javascript

	Copyright (C) 2013, Pierre Curto
	MIT license
 */
;(function (root) {

	var UINT32 = typeof root['UINT32'] == 'function'
		? root['UINT32']
		: require('../js-cuint').UINT32

	// this.v1.add( other.multiply(PRIME32_2) ).rotl(13).multiply(PRIME32_1);
	UINT32.prototype.xxh = function (other) {
		var b00 = PRIME32_2._low
		var b16 = PRIME32_2._high

		var c16, c00
		c00 = other._low * b00
		c16 = c00 >>> 16

		c16 += other._high * b00
		c16 &= 0xFFFF		// Not required but improves performance
		c16 += other._low * b16

		var a00 = this._low + (c00 & 0xFFFF)
		var a16 = a00 >>> 16

		a16 += this._high + (c16 & 0xFFFF)

		var v = (a16 << 16) | (a00 & 0xFFFF)
		v = (v << 13) | (v >>> 19)

		a00 = v & 0xFFFF
		a16 = v >>> 16

		b00 = PRIME32_1._low
		b16 = PRIME32_1._high

		c00 = a00 * b00
		c16 = c00 >>> 16

		c16 += a16 * b00
		c16 &= 0xFFFF		// Not required but improves performance
		c16 += a00 * b16

		this._low = c00 & 0xFFFF
		this._high = c16 & 0xFFFF
	}

	/*
	 * Constants
	 */
	var PRIME32_1 = UINT32( '2654435761' )
	var PRIME32_2 = UINT32( '2246822519' )
	var PRIME32_3 = UINT32( '3266489917' )
	var PRIME32_4 = UINT32(  '668265263' )
	var PRIME32_5 = UINT32(  '374761393' )

	var PRIME32_1plus2 = PRIME32_1.clone().add(PRIME32_2)

	/**
	 * XXH object used as a constructor or a function
	 * @constructor
	 * or
	 * @param {Object|String} input data
	 * @param {Number} seed
	 * @return ThisExpression
	 * or
	 * @return {UINT32} xxHash
	 */
	function XXH () {
		if (arguments.length == 2)
			return new XXH( arguments[1] ).update( arguments[0] ).digest()

		init.call(this, arguments[0])
	}

	/**
	 * Initialize the XXH instance with the given seed
	 * @method init
	 * @param {Number|Object} seed as a number or an unsigned 32 bits integer
	 * @return ThisExpression
	 */
	 function init (seed) {
		this.seed = seed instanceof UINT32 ? seed.clone() : UINT32(seed)
		this.v1 = this.seed.clone().add(PRIME32_1plus2)
		this.v2 = this.seed.clone().add(PRIME32_2)
		this.v3 = this.seed.clone()
		this.v4 = this.seed.clone().subtract(PRIME32_1)
		this.total_len = 0
		this.memsize = 0
		this.memory = null

		return this
	}
	XXH.prototype.init = init

	/**
	 * Add data to be computed for the XXH hash
	 * @method update
	 * @param {String|Buffer} input as a string or nodejs Buffer
	 * @return ThisExpression
	 */
	XXH.prototype.update = function (input) {
		var isString = typeof input == 'string'
		var p = 0
		var len = input.length
		var bEnd = p + len
		// Holder for the unsigned read from the input
		var u = new UINT32

		this.total_len += len

		if (this.memory == null && this.memsize == 0) this.memory = isString ? '' : new Buffer(16)

		if (this.memsize + len < 16)   // fill in tmp buffer
		{
			// XXH_memcpy(this.memory + this.memsize, input, len)
			if (isString) {
				this.memory += input
			} else {
				input.copy( this.memory, this.memsize, 0, len )
			}

			this.memsize += len
			return this
		}

		if (this.memsize > 0)   // some data left from previous update
		{
			// XXH_memcpy(this.memory + this.memsize, input, 16-this.memsize);
			if (isString) {
				this.memory += input.slice(0, 16 - this.memsize)
			} else {
				input.copy( this.memory, this.memsize, 0, 16 - this.memsize )
			}

			var p32 = 0

			if (isString) {
				u.fromBits(
					(input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
				,	(input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
				)
			} else {
				u.fromBits(
					(input[p+1] << 8) | input[p]
				,	(input[p+3] << 8) | input[p+2]
				)
			}
			this.v1.xxh(u)

			if (isString) {
				u.fromBits(
					(input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
				,	(input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
				)
			} else {
				u.fromBits(
					(input[p+1] << 8) | input[p]
				,	(input[p+3] << 8) | input[p+2]
				)
			}
			this.v2.xxh(u)

			if (isString) {
				u.fromBits(
					(input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
				,	(input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
				)
			} else {
				u.fromBits(
					(input[p+1] << 8) | input[p]
				,	(input[p+3] << 8) | input[p+2]
				)
			}
			this.v3.xxh(u)

			if (isString) {
				u.fromBits(
					(input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
				,	(input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
				)
			} else {
				u.fromBits(
					(input[p+1] << 8) | input[p]
				,	(input[p+3] << 8) | input[p+2]
				)
			}
			this.v4.xxh(u)

			p += 16 - this.memsize
			this.memsize = 0
		}

		if (p <= bEnd - 16)
		{
			var limit = bEnd - 16

			do
			{
				if (isString) {
					u.fromBits(
						(input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
					,	(input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
					)
				} else {
					u.fromBits(
						(input[p+1] << 8) | input[p]
					,	(input[p+3] << 8) | input[p+2]
					)
				}
				// this.v1.add( u.multiply(PRIME32_2) ).rotl(13).multiply(PRIME32_1); p += 4
				this.v1.xxh(u); p+=4

				if (isString) {
					u.fromBits(
						(input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
					,	(input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
					)
				} else {
					u.fromBits(
						(input[p+1] << 8) | input[p]
					,	(input[p+3] << 8) | input[p+2]
					)
				}
				// this.v2.add( u.multiply(PRIME32_2) ).rotl(13).multiply(PRIME32_1); p += 4
				this.v2.xxh(u); p+=4

				if (isString) {
					u.fromBits(
						(input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
					,	(input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
					)
				} else {
					u.fromBits(
						(input[p+1] << 8) | input[p]
					,	(input[p+3] << 8) | input[p+2]
					)
				}
				// this.v3.add( u.multiply(PRIME32_2) ).rotl(13).multiply(PRIME32_1); p += 4
				this.v3.xxh(u); p+=4

				if (isString) {
					u.fromBits(
						(input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
					,	(input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
					)
				} else {
					u.fromBits(
						(input[p+1] << 8) | input[p]
					,	(input[p+3] << 8) | input[p+2]
					)
				}
				// this.v4.add( u.multiply(PRIME32_2) ).rotl(13).multiply(PRIME32_1); p += 4
				this.v4.xxh(u); p+=4
			} while (p <= limit)
		}

		if (p < bEnd)
		{
			// XXH_memcpy(this.memory, p, bEnd-p);
			if (isString) {
				this.memory += input.slice(p)
			} else {
				input.copy( this.memory, this.memsize, p, bEnd )
			}

			this.memsize = bEnd - p
		}

		return this
	}

	/**
	 * Finalize the XXH computation. The XXH instance is ready for reuse for the given seed
	 * @method digest
	 * @return {UINT32} xxHash
	 */
	XXH.prototype.digest = function () {
		var input = this.memory
		var isString = typeof input == 'string'
		var p = 0
		var bEnd = this.memsize
		var h32, h
		var u = new UINT32

		if (this.total_len >= 16)
		{
			h32 = this.v1.rotl(1).add( this.v2.rotl(7).add( this.v3.rotl(12).add( this.v4.rotl(18) ) ) )
		}
		else
		{
			h32  = this.seed.add( PRIME32_5 )
		}

		h32.add( u.fromNumber(this.total_len) )

		while (p <= bEnd - 4)
		{
			if (isString) {
				u.fromBits(
					(input.charCodeAt(p+1) << 8) | input.charCodeAt(p)
				,	(input.charCodeAt(p+3) << 8) | input.charCodeAt(p+2)
				)
			} else {
				u.fromBits(
					(input[p+1] << 8) | input[p]
				,	(input[p+3] << 8) | input[p+2]
				)
			}
			h32
				.add( u.multiply(PRIME32_3) )
				.rotl(17)
				.multiply( PRIME32_4 )
			p += 4
		}

		while (p < bEnd)
		{
			u.fromBits( isString ? input.charCodeAt(p++) : input[p++], 0 )
			h32
				.add( u.multiply(PRIME32_5) )
				.rotl(11)
				.multiply(PRIME32_1)
		}

		h = h32.clone().shiftRight(15)
		h32.xor(h).multiply(PRIME32_2)

		h = h32.clone().shiftRight(13)
		h32.xor(h).multiply(PRIME32_3)

		h = h32.clone().shiftRight(16)
		h32.xor(h)

		return h32
	}

	if (typeof define != 'undefined' && define.amd) {
		// AMD / RequireJS
		define([], function () {
			return XXH
		})
	} else if (typeof module != 'undefined' && module.exports) {
		// Node.js
		module.exports = XXH
	} else {
		// Browser
		root['XXH'] = XXH
	}

})(this)