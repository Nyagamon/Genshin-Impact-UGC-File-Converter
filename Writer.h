#pragma once

#include <stdint.h>
#include <vector>
#include <string>

class Writer{
public:
	Writer()noexcept{}

	std::vector<uint8_t> &buf(void)noexcept{return _buf;}

	bool write_bytes(const uint8_t *data, size_t size)noexcept;
	bool write_int(uint32_t value)noexcept;
	bool write_float(float value)noexcept;
	bool write_data(const std::vector<uint8_t> &data)noexcept;
	bool write_string(const std::string &string)noexcept;

private:
	std::vector<uint8_t> _buf{};
};

