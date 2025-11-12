#pragma once

#include "JsonEx.h"
#include <vector>

class UgcData: public JsonEx{
public:

	struct Ex{
		enum class Type{
			unknown_t, // 型が不明。データ型として取り扱う。文字列型やオブジェクトの可能性もある。
			int_t,     // 整数型
			float_t,   // 浮動小数点数型
			string_t,  // 文字列型
			data_t,    // データ型
			array_t,   // 配列
			object_t,  // オブジェクト
		};
		uint32_t id{};
		std::string name{};
		Type type{};
		std::vector<uint8_t> data{};
		uint32_t offset{};
		uint32_t line{};
	};
	Ex *ex(Node &node)noexcept{return reinterpret_cast<Ex *>(node.ex);}

	Node *push_back_int(Node &parent, uint32_t id, const std::string &name, uint32_t value, uint32_t offset, uint32_t line)noexcept;
	Node *push_back_float(Node &parent, uint32_t id, const std::string &name, double value, uint32_t offset, uint32_t line)noexcept;
	Node *push_back_string(Node &parent, uint32_t id, const std::string &name, const char *value, size_t value_size, uint32_t offset, uint32_t line)noexcept;
	Node *push_back_data(Node &parent, uint32_t id, const std::string &name, const uint8_t *value, size_t value_size, uint32_t offset, uint32_t line)noexcept;
	Node *push_back_array(Node &parent, uint32_t id, const std::string &name, uint32_t offset, uint32_t line)noexcept;
	Node *push_back_object(Node &parent, uint32_t id, const std::string &name, uint32_t offset, uint32_t line)noexcept;

	Node *search_id(Node &parent_object, uint32_t id)const noexcept;

private:
	bool _load(Node &node)noexcept;
	bool _save(Node &node)noexcept;
	std::list<Ex> _exes{};
};
