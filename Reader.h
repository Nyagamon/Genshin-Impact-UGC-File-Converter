#pragma once

#include <stdint.h>

class Reader{
public:
	Reader(const uint8_t *data, size_t data_size, uint32_t a=0)noexcept: _s(data), _e(data + data_size), _s2(data), _a(a){}

	uint32_t offset(void)const noexcept{return (uint32_t)(_s - _s2) + _a;}


	bool is_eof(void)const noexcept{return _s == _e;}
	bool is_error(void)const noexcept{return _s > _e;}
	bool is_eof_error(void)const noexcept{return _s >= _e;}

	uint8_t peek_uint8(void)const noexcept;
	uint32_t peek_uint(void)noexcept;
	uint8_t read_uint8(void)noexcept;
	uint32_t read_uint32(void)noexcept;
	float read_float(void)noexcept;
	uint32_t read_uint(void)noexcept;
	const uint8_t *read_data(size_t size)noexcept;

private:
	const uint8_t *_s{nullptr}, *_e{nullptr}, *_s2{nullptr};
	bool _check(size_t size)noexcept;
	uint32_t _a{};
};
