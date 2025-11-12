#pragma once

#include <stdint.h>
#include <vector>
#include <list>

class Log{
public:
	Log()noexcept{}

	bool add_type_unknown(uint32_t line, uint32_t id, uint8_t type)noexcept;
	bool add_insert_int(uint32_t line, uint32_t id, uint32_t value)noexcept;
	bool add_insert_float(uint32_t line, uint32_t id, double value)noexcept;
	bool add_insert_unknown(uint32_t line, uint32_t id, const uint8_t *data, size_t data_size)noexcept;
	bool add_is_array(uint32_t line, uint32_t id)noexcept;
	bool add_unknown(uint32_t line, uint32_t id, const std::vector<uint8_t> &data)noexcept;

	bool is_update(void)const noexcept;
	void print(void)noexcept;

private:
	struct Data{
		enum class Type{
			type_unknown,
			insert_int,
			insert_float,
			insert_unknown,
			is_array,
			unknown,
		};
		Type type{};
		uint32_t line{};
		uint32_t id{};
		uint8_t unknown_type{};
		uint32_t value_int{};
		double value_float{};
		std::vector<uint8_t> value_data{};
	};
	std::list<Data> _logs{};
};
