#include "Writer.h"


bool Writer::write_bytes(const uint8_t *data, size_t size)noexcept{
	auto pos = _buf.size();
	try{
		auto capacity = _buf.capacity();
		auto required_size = pos + size;
		if(required_size > capacity){
			for(capacity = capacity < 1024 ? 1024 : capacity; required_size > capacity; capacity += capacity);
			_buf.reserve(capacity);
		}
		_buf.resize(required_size);
	}catch(...){
		return false;
	}
	memcpy_s(&_buf[pos], size, data, size);
	return true;
}
bool Writer::write_int(uint32_t value)noexcept{
	uint8_t data[8];
	size_t size = 0;
	for(; size == 0 || (value && size < 8); ++size){
		uint8_t v = value & 0x7F;
		value >>= 7;
		if(value){
			v |= 0x80;
		}
		data[size] = v;
	}
	return write_bytes(data, size);
};
bool Writer::write_float(float value)noexcept{
	return write_bytes(reinterpret_cast<const uint8_t *>(&value), sizeof(value));
}
bool Writer::write_data(const std::vector<uint8_t> &data)noexcept{
	auto r = write_int(static_cast<uint32_t>(data.size()));
	if(!data.empty()){
		r &= write_bytes(&data[0], data.size());
	}
	return r;
}
bool Writer::write_string(const std::string &string)noexcept{
	auto r = write_int(static_cast<uint32_t>(string.size()));
	if(!string.empty()){
		r &= write_bytes(reinterpret_cast<const uint8_t *>(string.c_str()), string.size());
	}
	return r;
}

