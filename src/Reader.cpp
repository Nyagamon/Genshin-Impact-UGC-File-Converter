#include "Reader.h"

uint8_t Reader::peek_uint8(void)const noexcept{
	if(_s + 1 > _e){
		return 0;
	}
	return *_s;
}
uint32_t Reader::peek_uint(void)noexcept{
	uint32_t r = 0;
	auto s = _s;
	for(int i = 0; i < 35; i += 7){
		if(s + 1 > _e){
			break;
		}
		auto v = *s;
		++s;
		r |= (uint32_t)(v & 0x7F) << i;
		if(!(v & 0x80))break;
	}
	return r;
}
uint8_t Reader::read_uint8(void)noexcept{
	if(!_check(1))return 0;
	auto v = *_s;
	++_s;
	return v;
}
uint32_t Reader::read_uint32(void)noexcept{
	if(!_check(4))return 0;
	auto v = *(uint32_t *)_s;
	_s += 4;
	return v;
}
float Reader::read_float(void)noexcept{
	if(!_check(4))return 0;
	auto v = *(float *)_s;
	_s += 4;
	return v;
}
uint32_t Reader::read_uint(void)noexcept{
	uint32_t r = 0;
	for(int i = 0; i < 35; i += 7){
		auto v = read_uint8();
		r |= (uint32_t)(v & 0x7F) << i;
		if(!(v & 0x80))break;
	}
	return r;
}
const uint8_t *Reader::read_data(size_t size)noexcept{
	if(!_check(size))return nullptr;
	auto data = _s;
	_s += size;
	return data;
}

bool Reader::_check(size_t size)noexcept{
	if(_s + size > _e){
		_s = _e + 1;
		return false;
	}
	return true;
}
